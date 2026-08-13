/** Production sync engine for POS offline queue. */

import {
  cacheGet,
  cacheSet,
  enqueueAction,
  listDeadActions,
  listPendingActions,
  mapLocalToServerId,
  markActionError,
  markActionSynced,
  pruneSyncedActions,
  replaceInventory,
  replaceOrdersPreservingUnsynced,
  resolveServerOrderId,
  upsertLocalOrder,
  listLocalOrders,
  deleteLocalOrder,
  pruneCacheKeys,
  reviveDeadAction,
} from "@/lib/offline-db";
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  bindConnectivityListeners,
  clearForcedOffline,
  forceOfflineNow,
  isNetworkError,
  isOnline,
  isPermanentSyncError,
  isQueueableError,
  shouldCountSyncAttempt,
  POS_CONNECTIVITY_EVENT,
} from "@/lib/network";
import { notifyOrdersChanged } from "@/lib/offline-events";
import type {
  CreateOrderInput,
  InventoryItem,
  OfflineAction,
  Order,
  SyncConflict,
  SyncStatus,
} from "@/types";

const SYNC_META_KEY = "sync_meta";
const CONFLICTS_KEY = "sync_conflicts";
const MAX_ATTEMPTS = 8;
export const POS_SYNC_COMPLETE_EVENT = "pos-sync-complete";

type SyncMeta = {
  last_sync_at: string | null;
  last_error: string | null;
};

export type SyncEngineState = SyncStatus & {
  online: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  conflicts: SyncConflict[];
  dead_count: number;
};

type Listener = (state: SyncEngineState) => void;

const DEFAULT_STATE: SyncEngineState = {
  online: true,
  syncing: false,
  pending_count: 0,
  completed: 0,
  total: 0,
  current_action: null,
  last_sync_at: null,
  last_error: null,
  conflicts: [],
  dead_count: 0,
};

let state: SyncEngineState = { ...DEFAULT_STATE };
const listeners = new Set<Listener>();
let syncPromise: Promise<void> | null = null;
let backoffMs = 500;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let drainTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

/** Push remaining due queue items without waiting for the slow interval. */
function scheduleDrainSoon() {
  if (!isOnline()) return;
  if (drainTimer) clearTimeout(drainTimer);
  drainTimer = setTimeout(() => {
    drainTimer = null;
    if (!isOnline()) return;
    void runSync("drain");
  }, 50);
}

function emit() {
  for (const l of listeners) l(state);
}

function setState(patch: Partial<SyncEngineState>) {
  state = { ...state, ...patch };
  emit();
}

function notifyClients() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(POS_SYNC_COMPLETE_EVENT));
  }
}

async function loadMeta() {
  const meta = await cacheGet<SyncMeta>(SYNC_META_KEY);
  const conflicts = (await cacheGet<SyncConflict[]>(CONFLICTS_KEY)) || [];
  setState({
    last_sync_at: meta?.last_sync_at ?? null,
    last_error: meta?.last_error ?? null,
    conflicts,
  });
}

async function saveMeta(patch: Partial<SyncMeta>) {
  const prev = (await cacheGet<SyncMeta>(SYNC_META_KEY)) || {
    last_sync_at: null,
    last_error: null,
  };
  const next = { ...prev, ...patch };
  await cacheSet(SYNC_META_KEY, next);
  setState({
    last_sync_at: next.last_sync_at,
    last_error: next.last_error,
  });
}

export async function logConflict(
  conflict: Omit<SyncConflict, "id" | "created_at">,
) {
  const entry: SyncConflict = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...conflict,
  };
  const prev = (await cacheGet<SyncConflict[]>(CONFLICTS_KEY)) || [];
  const next = [entry, ...prev].slice(0, 100);
  await cacheSet(CONFLICTS_KEY, next);
  setState({ conflicts: next });
  return entry;
}

export async function refreshPendingCount() {
  const [pending, dead] = await Promise.all([
    listPendingActions(),
    listDeadActions(),
  ]);
  setState({ pending_count: pending.length, dead_count: dead.length });
  return pending.length;
}

function scheduleRetry(delay = backoffMs) {
  // Don't schedule network retries while effectively offline — saves CPU.
  if (!isOnline()) return;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    if (!isOnline()) return;
    void runSync("retry");
  }, delay);
}

function bumpBackoff() {
  backoffMs = Math.min(backoffMs * 2, 60_000);
}

function resetBackoff() {
  backoffMs = 500;
}

async function resolveOrderId(id: string) {
  return resolveServerOrderId(id);
}

/** CREATE before COMPLETE/CANCEL so follow-ups rarely skip in the same pass. */
function syncActionPriority(type: string): number {
  if (type === "CREATE_ORDER") return 0;
  if (type === "UPDATE_ORDER") return 1;
  if (type === "COMPLETE_ORDER" || type === "CANCEL_ORDER") return 2;
  return 3;
}

async function processAction(
  action: OfflineAction,
): Promise<"ok" | "retry" | "skip" | "dead"> {
  switch (action.type) {
    case "CREATE_ORDER": {
      const p = action.payload as {
        input: CreateOrderInput;
        orderType: "walkin" | "phone" | "website";
        localId?: string;
      };
      const path =
        p.orderType === "phone"
          ? "/orders/phone"
          : p.orderType === "walkin"
            ? "/orders/walkin"
            : "/orders";
      const order = await apiFetch<Order>(path, {
        method: "POST",
        body: JSON.stringify(p.input),
      });

      // Never flash server PENDING over a locally completed/cancelled order.
      // Staff may have already pressed Complete before CREATE finished syncing.
      const localExisting = p.localId
        ? (await listLocalOrders()).find((o) => o.id === p.localId)
        : undefined;
      const followUps = p.localId
        ? (await listPendingActions()).filter((follow) => {
            if (follow.id === action.id) return false;
            const fid = (follow.payload as { id?: string })?.id;
            return fid === p.localId;
          })
        : [];
      const willComplete =
        followUps.some((f) => f.type === "COMPLETE_ORDER") ||
        localExisting?.order_status === "COMPLETED";
      const willCancel =
        followUps.some((f) => f.type === "CANCEL_ORDER") ||
        localExisting?.order_status === "CANCELLED";

      let orderStatus = order.order_status;
      if (willComplete) orderStatus = "COMPLETED";
      else if (willCancel) orderStatus = "CANCELLED";

      const { preferEarlierCreatedAt } = await import("@/lib/order-identity");
      const syncedOrder: Order = {
        ...order,
        client_order_id:
          order.client_order_id ||
          p.input.client_order_id ||
          p.localId ||
          order.id,
        created_at: preferEarlierCreatedAt(
          localExisting?.created_at,
          preferEarlierCreatedAt(p.input.created_at, order.created_at),
        ),
        order_status: orderStatus,
        // Keep pending_sync until follow-up COMPLETE/CANCEL PATCH succeeds.
        sync_status:
          willComplete || willCancel
            ? ("pending_sync" as const)
            : ("synced" as const),
      };
      await upsertLocalOrder(syncedOrder);

      if (p.localId) {
        await mapLocalToServerId(p.localId, order.id);
        // Purge every local twin for this ticket (client UUID / LOCAL-* row).
        const locals = await listLocalOrders();
        for (const row of locals) {
          if (row.id === syncedOrder.id) continue;
          if (
            row.id === p.localId ||
            row.client_order_id === p.localId ||
            row.client_order_id === syncedOrder.client_order_id
          ) {
            await deleteLocalOrder(row.id);
          }
        }
        for (const follow of followUps) {
          if (follow.type === "COMPLETE_ORDER") {
            await apiFetch(`/orders/${order.id}/complete`, { method: "PATCH" });
            await markActionSynced(follow.id);
            await upsertLocalOrder({
              ...syncedOrder,
              order_status: "COMPLETED",
              sync_status: "synced",
              updated_at: new Date().toISOString(),
            });
          }
          if (follow.type === "CANCEL_ORDER") {
            await apiFetch(`/orders/${order.id}/cancel`, { method: "PATCH" });
            await markActionSynced(follow.id);
            await upsertLocalOrder({
              ...syncedOrder,
              order_status: "CANCELLED",
              sync_status: "synced",
              updated_at: new Date().toISOString(),
            });
          }
          if (follow.type === "UPDATE_ORDER") {
            const updates = (follow.payload as { updates: Record<string, unknown> })
              .updates;
            await apiFetch(`/orders/${order.id}`, {
              method: "PUT",
              body: JSON.stringify(updates),
            });
            await markActionSynced(follow.id);
          }
        }
      }
      notifyOrdersChanged();
      return "ok";
    }
    case "COMPLETE_ORDER": {
      const localId = (action.payload as { id: string }).id;
      const pendingCreates = await listPendingActions();
      const waitingCreate = pendingCreates.some(
        (a) =>
          a.type === "CREATE_ORDER" &&
          (a.payload as { localId?: string }).localId === localId,
      );
      if (waitingCreate) return "skip";
      // Dead CREATE must be revived before COMPLETE — otherwise we PATCH a
      // client UUID that never existed on the server (permanent 404).
      const deadCreates = await listDeadActions();
      const deadCreate = deadCreates.find(
        (a) =>
          a.type === "CREATE_ORDER" &&
          (a.payload as { localId?: string }).localId === localId,
      );
      if (deadCreate) {
        await reviveDeadAction(deadCreate.id);
        return "skip";
      }
      const serverId = await resolveOrderId(localId);
      try {
        await apiFetch(`/orders/${serverId}/complete`, { method: "PATCH" });
      } catch (err) {
        if (isQueueableError(err)) throw err;
        if (
          !(
            err instanceof ApiError &&
            (err.status === 409 ||
              /already|completed|not pending/i.test(err.message))
          )
        ) {
          throw err;
        }
      }
      {
        const locals = await listLocalOrders();
        const local =
          locals.find((o) => o.id === serverId) ||
          locals.find((o) => o.id === localId);
        if (local) {
          await upsertLocalOrder({
            ...local,
            id: serverId,
            order_status: "COMPLETED",
            sync_status: "synced",
            updated_at: new Date().toISOString(),
          });
          if (localId !== serverId) await deleteLocalOrder(localId);
        }
      }
      notifyOrdersChanged();
      return "ok";
    }
    case "CANCEL_ORDER": {
      const localId = (action.payload as { id: string }).id;
      const waitingCreate = (await listPendingActions()).some(
        (a) =>
          a.type === "CREATE_ORDER" &&
          (a.payload as { localId?: string }).localId === localId,
      );
      if (waitingCreate) return "skip";
      const deadCreate = (await listDeadActions()).find(
        (a) =>
          a.type === "CREATE_ORDER" &&
          (a.payload as { localId?: string }).localId === localId,
      );
      if (deadCreate) {
        await reviveDeadAction(deadCreate.id);
        return "skip";
      }
      const serverId = await resolveOrderId(localId);
      try {
        await apiFetch(`/orders/${serverId}/cancel`, { method: "PATCH" });
      } catch (err) {
        if (isQueueableError(err)) throw err;
        if (
          !(
            err instanceof ApiError &&
            (err.status === 409 ||
              /already|cancelled|not pending/i.test(err.message))
          )
        ) {
          throw err;
        }
      }
      {
        const locals = await listLocalOrders();
        const local =
          locals.find((o) => o.id === serverId) ||
          locals.find((o) => o.id === localId);
        if (local) {
          await upsertLocalOrder({
            ...local,
            id: serverId,
            order_status: "CANCELLED",
            sync_status: "synced",
            updated_at: new Date().toISOString(),
          });
          if (localId !== serverId) await deleteLocalOrder(localId);
        }
      }
      notifyOrdersChanged();
      return "ok";
    }
    case "CREATE_PRODUCT": {
      const p = action.payload as {
        id?: string;
        product?: Record<string, unknown>;
        sizes?: { id?: string; size: string; price: number }[];
      } & Record<string, unknown>;
      const raw = { ...(p.product || p) } as Record<string, unknown>;
      delete raw.sizes;
      delete raw.product;
      delete raw.updates;
      const productId = String(raw.id || p.id || "");
      await apiFetch("/products", {
        method: "POST",
        body: JSON.stringify(raw),
      });
      for (const s of p.sizes || []) {
        await apiFetch("/product-sizes", {
          method: "POST",
          body: JSON.stringify({
            id: s.id,
            product_id: productId,
            size: s.size,
            price: s.price,
          }),
        });
      }
      return "ok";
    }
    case "UPDATE_PRODUCT": {
      const p = action.payload as {
        id: string;
        product?: Record<string, unknown>;
        sizes?: { id?: string; size: string; price: number }[];
        updates?: Record<string, unknown>;
      };
      const body = { ...(p.product || p.updates || {}) } as Record<
        string,
        unknown
      >;
      delete body.sizes;
      delete body.product;
      delete body.updates;
      delete body.id;
      await apiFetch(`/products/${p.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (p.sizes) {
        const allSizes = await apiFetch<
          { id: string; product_id: string; size: string; price: number }[]
        >("/product-sizes");
        const existing = allSizes.filter((s) => s.product_id === p.id);
        const desired = new Set(p.sizes.map((s) => s.size.toLowerCase()));
        for (const e of existing) {
          if (!desired.has(e.size.toLowerCase())) {
            try {
              await apiFetch(`/product-sizes/${e.id}`, { method: "DELETE" });
            } catch {
              // Size may be referenced by old orders — leave it, sync the rest.
            }
          }
        }
        for (const s of p.sizes) {
          const match = existing.find(
            (e) => e.size.toLowerCase() === s.size.toLowerCase(),
          );
          if (match) {
            await apiFetch(`/product-sizes/${match.id}`, {
              method: "PUT",
              body: JSON.stringify({ size: s.size, price: s.price }),
            });
          } else {
            await apiFetch("/product-sizes", {
              method: "POST",
              body: JSON.stringify({
                id: s.id,
                product_id: p.id,
                size: s.size,
                price: s.price,
              }),
            });
          }
        }
      }
      return "ok";
    }
    case "CREATE_PRODUCT_SIZE":
      await apiFetch("/product-sizes", {
        method: "POST",
        body: JSON.stringify(action.payload),
      });
      return "ok";
    case "UPDATE_PRODUCT_SIZE": {
      const p = action.payload as { id: string; updates: Record<string, unknown> };
      await apiFetch(`/product-sizes/${p.id}`, {
        method: "PUT",
        body: JSON.stringify(p.updates),
      });
      return "ok";
    }
    case "DELETE_PRODUCT_SIZE": {
      const id = (action.payload as { id: string }).id;
      await apiFetch(`/product-sizes/${id}`, { method: "DELETE" });
      return "ok";
    }
    case "CREATE_CATEGORY":
      await apiFetch("/categories", {
        method: "POST",
        body: JSON.stringify(action.payload),
      });
      return "ok";
    case "UPDATE_CATEGORY": {
      const p = action.payload as { id: string; updates: Record<string, unknown> };
      await apiFetch(`/categories/${p.id}`, {
        method: "PUT",
        body: JSON.stringify(p.updates),
      });
      return "ok";
    }
    case "CREATE_INVENTORY": {
      await apiFetch("/inventory", {
        method: "POST",
        body: JSON.stringify(action.payload),
      });
      return "ok";
    }
    case "UPDATE_INVENTORY": {
      const p = action.payload as {
        id: string;
        updates: Record<string, unknown>;
        expected_stock?: number;
      };
      let serverItem: InventoryItem | null = null;
      try {
        const all = await apiFetch<InventoryItem[]>("/inventory");
        serverItem = all.find((i) => i.id === p.id) || null;
        await replaceInventory(all);
      } catch {
        /* proceed */
      }
      if (
        serverItem &&
        typeof p.expected_stock === "number" &&
        serverItem.stock !== p.expected_stock
      ) {
        await logConflict({
          entity: "inventory",
          entity_id: p.id,
          message: `Stock conflict for ${serverItem.name}: local expected ${p.expected_stock}, server has ${serverItem.stock}. Server kept; non-stock fields applied.`,
          local: p.updates,
          server: serverItem,
        });
        const { stock: _ignoredStock, ...safe } = p.updates;
        void _ignoredStock;
        if (Object.keys(safe).length) {
          await apiFetch(`/inventory/${p.id}`, {
            method: "PUT",
            body: JSON.stringify(safe),
          });
        }
        return "ok";
      }
      await apiFetch(`/inventory/${p.id}`, {
        method: "PUT",
        body: JSON.stringify(p.updates),
      });
      return "ok";
    }
    case "UPDATE_SETTINGS":
      await apiFetch("/settings", {
        method: "PUT",
        body: JSON.stringify(action.payload),
      });
      return "ok";
    case "CREATE_OFFER":
      await apiFetch("/offers", {
        method: "POST",
        body: JSON.stringify(action.payload),
      });
      return "ok";
    case "UPDATE_OFFER": {
      const p = action.payload as { id: string; updates: Record<string, unknown> };
      await apiFetch(`/offers/${p.id}`, {
        method: "PUT",
        body: JSON.stringify(p.updates),
      });
      return "ok";
    }
    case "UPDATE_ORDER": {
      const p = action.payload as { id: string; updates: Record<string, unknown> };
      const waiting = (await listPendingActions()).find(
        (a) =>
          a.type === "CREATE_ORDER" &&
          (a.payload as { localId?: string }).localId === p.id,
      );
      if (waiting) return "skip";
      const serverId = await resolveOrderId(p.id);
      await apiFetch(`/orders/${serverId}`, {
        method: "PUT",
        body: JSON.stringify(p.updates),
      });
      return "ok";
    }
    default:
      return "ok";
  }
}

const PERMANENT_DEAD_ERROR =
  /invalid product|unavailable|cart cannot be empty|customer name is required|invalid phone|invalid location/i;

async function reviveDeadActionsOnReconnect() {
  const dead = await listDeadActions();
  for (const action of dead) {
    if (action.error && PERMANENT_DEAD_ERROR.test(action.error)) continue;
    await reviveDeadAction(action.id);
  }
}

export async function runSync(reason: string = "manual"): Promise<void> {
  if (!isOnline()) {
    setState({ online: false });
    await refreshPendingCount();
    return;
  }
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    setState({ online: true, syncing: true, completed: 0, current_action: null });
    try {
      if (reason === "online" || reason === "startup" || reason === "manual" || reason === "visible") {
        await reviveDeadActionsOnReconnect();
      }
      const pending = await listPendingActions();
      const now = Date.now();
      const due = pending
        .filter((a) => {
          if (!a.next_retry_at) return true;
          return new Date(a.next_retry_at).getTime() <= now;
        })
        .slice()
        .sort((a, b) => syncActionPriority(a.type) - syncActionPriority(b.type));
      setState({ total: due.length, pending_count: pending.length });

      let hadFailure = false;
      let lastError: string | null = null;
      const skipped: OfflineAction[] = [];

      const runOne = async (action: OfflineAction, collectSkips: boolean) => {
        const stillOpen = (await listPendingActions()).some(
          (a) => a.id === action.id,
        );
        if (!stillOpen) return;

        setState({ current_action: action.type });
        try {
          const result = await processAction(action);
          if (result === "ok") {
            await markActionSynced(action.id);
            setState({ completed: state.completed + 1 });
          } else if (result === "skip" && collectSkips) {
            skipped.push(action);
          }
        } catch (err) {
          hadFailure = true;
          const message =
            err instanceof Error ? err.message : "Sync failed";
          lastError = message;
          const countAttempt = shouldCountSyncAttempt(err);
          const attempts = countAttempt
            ? (action.attempts || 0) + 1
            : action.attempts || 0;
          const permanent =
            isPermanentSyncError(err) ||
            (countAttempt && attempts >= MAX_ATTEMPTS);

          if (permanent) {
            await markActionError(action.id, message, {
              attempts,
              dead: true,
            });
            await logConflict({
              entity: "sync_queue",
              entity_id: action.id,
              message: `Dead-letter after ${attempts} attempts: ${action.type} — ${message}`,
              local: action.payload,
            });
            return;
          }

          const delay = Math.min(1000 * 2 ** Math.min(attempts || 1, 6), 60_000);
          await markActionError(action.id, message, {
            attempts,
            next_retry_at: new Date(Date.now() + delay).toISOString(),
          });
          if (isNetworkError(err) || isQueueableError(err)) {
            bumpBackoff();
            throw err;
          }
        }
      };

      try {
        for (const action of due) {
          await runOne(action, true);
        }
        // Second pass: COMPLETE/CANCEL that waited on CREATE in this same run.
        for (const action of skipped) {
          await runOne(action, false);
        }
      } catch {
        /* network break already recorded */
      }

      await pruneSyncedActions(50);
      await pruneCacheKeys([]);

      // Keep order push fast: enqueue/drain only drain the queue. Full catalog
      // pull runs on startup, reconnect, tab focus, manual sync, or interval.
      const stillPending = await listPendingActions();
      const stillIds = new Set(stillPending.map((a) => a.id));
      const syncedSomething = due.some((a) => !stillIds.has(a.id));

      const shouldRefreshCatalog =
        reason === "manual" ||
        reason === "startup" ||
        reason === "online" ||
        reason === "visible" ||
        (reason === "interval" && (syncedSomething || due.length === 0));

      if (shouldRefreshCatalog && (!hadFailure || reason === "manual")) {
        try {
          const [orders, inventory, discountRules] = await Promise.all([
            apiFetch<Order[]>("/orders?limit=200"),
            apiFetch<InventoryItem[]>("/inventory"),
            apiFetch<
              {
                id: string;
                name: string;
                active: boolean;
                percent: number;
                min_subtotal: number;
                schedule_type: string;
                start_date?: string | null;
                end_date?: string | null;
                weekdays_json?: string;
                exclude_deals?: boolean;
              }[]
            >("/discount-rules/active").catch(() => []),
          ]);
          await replaceOrdersPreservingUnsynced(orders);
          await replaceInventory(inventory);
          const { setDiscountRulesCache } = await import("@/lib/weekend-promo");
          const { cacheSet } = await import("@/lib/offline-db");
          setDiscountRulesCache(discountRules || []);
          await cacheSet("discount_rules", discountRules || []);
        } catch {
          /* ignore refresh failures */
        }
      }

      await saveMeta({
        last_sync_at: new Date().toISOString(),
        last_error: hadFailure ? lastError : null,
      });
      if (hadFailure) {
        scheduleRetry(backoffMs);
      } else {
        resetBackoff();
      }
      notifyClients();

      // Completes enqueued while CREATE was in flight must not wait on interval.
      // Only re-drain when this pass actually moved the queue (avoids a skip loop).
      const nowMs = Date.now();
      const dueLeft = stillPending.some((a) => {
        if (!a.next_retry_at) return true;
        return new Date(a.next_retry_at).getTime() <= nowMs;
      });
      if (syncedSomething && dueLeft && isOnline()) {
        scheduleDrainSoon();
      }
    } finally {
      await refreshPendingCount();
      setState({ syncing: false, current_action: null });
      syncPromise = null;
    }
  })();

  return syncPromise;
}

export function getSyncState() {
  return state;
}

export function subscribeSync(listener: Listener) {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function startSyncEngine() {
  if (started || typeof window === "undefined") return;
  started = true;
  bindConnectivityListeners();
  void loadMeta().then(async () => {
    await refreshPendingCount();
    try {
      const { cacheGet } = await import("@/lib/offline-db");
      const { setDiscountRulesCache } = await import("@/lib/weekend-promo");
      const cached = await cacheGet<Parameters<typeof setDiscountRulesCache>[0]>(
        "discount_rules",
      );
      if (cached?.length) setDiscountRulesCache(cached);
    } catch {
      /* ignore */
    }
  });

  const onOnline = () => {
    clearForcedOffline();
    setState({ online: true });
    resetBackoff();
    void runSync("online");
  };
  const onOffline = () => {
    forceOfflineNow();
    setState({ online: false });
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (drainTimer) {
      clearTimeout(drainTimer);
      drainTimer = null;
    }
  };
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  const onConnectivity = (e: Event) => {
    const online = Boolean(
      (e as CustomEvent<{ online?: boolean }>).detail?.online,
    );
    setState({ online });
    // API reachable again after a forced-offline cooldown — push immediately.
    if (online) {
      resetBackoff();
      void runSync("online");
    }
  };
  window.addEventListener(POS_CONNECTIVITY_EVENT, onConnectivity);

  const onVisible = () => {
    if (document.hidden) return;
    if (!isOnline()) return;
    void runSync("visible");
  };
  document.addEventListener("visibilitychange", onVisible);

  setState({ online: isOnline() });

  const interval = setInterval(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (!isOnline()) {
      void refreshPendingCount();
      return;
    }
    void runSync("interval");
  }, 15_000);

  if (isOnline()) void runSync("startup");

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener(POS_CONNECTIVITY_EVENT, onConnectivity);
    document.removeEventListener("visibilitychange", onVisible);
    clearInterval(interval);
    if (retryTimer) clearTimeout(retryTimer);
    if (drainTimer) clearTimeout(drainTimer);
    started = false;
  };
}

export async function enqueueAndTrack(
  action: Omit<OfflineAction, "id" | "created_at" | "synced">,
) {
  const item = await enqueueAction(action);
  await refreshPendingCount();
  if (!isOnline()) return item;
  // If CREATE is already syncing, wait then start another pass so immediate
  // COMPLETE is not stuck until the next interval tick.
  if (syncPromise) {
    try {
      await syncPromise;
    } catch {
      /* ignore */
    }
  }
  void runSync("enqueue");
  return item;
}
