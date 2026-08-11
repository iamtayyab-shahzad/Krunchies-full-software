import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  Category,
  Customer,
  InventoryItem,
  OfflineAction,
  Order,
  PendingDraft,
  Product,
  Settings,
} from "@/types";

export type CachedSession = {
  username: string;
  token: string;
  exp: number | null;
  saved_at: string;
};

interface PosDB extends DBSchema {
  pending_drafts: {
    key: string;
    value: PendingDraft;
  };
  offline_queue: {
    key: string;
    value: OfflineAction;
    indexes: { "by-synced": number };
  };
  cache: {
    key: string;
    value: { key: string; data: unknown; updated_at: string };
  };
  products: {
    key: string;
    value: Product;
    indexes: { "by-category": string };
  };
  categories: {
    key: string;
    value: Category;
    indexes: { "by-order": number };
  };
  orders: {
    key: string;
    value: Order;
    indexes: { "by-status": string; "by-created": string };
  };
  inventory: {
    key: string;
    value: InventoryItem;
  };
  settings: {
    key: string;
    value: Settings & { id: string };
  };
  session: {
    key: string;
    value: CachedSession & { id: string };
  };
  customers: {
    key: string;
    value: Customer;
    indexes: { "by-phone": string };
  };
}

const DB_NAME = "krunchies-pos";
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<PosDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<PosDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("pending_drafts", { keyPath: "id" });
          const queue = db.createObjectStore("offline_queue", {
            keyPath: "id",
          });
          queue.createIndex("by-synced", "synced");
          db.createObjectStore("cache", { keyPath: "key" });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("products")) {
            const products = db.createObjectStore("products", {
              keyPath: "id",
            });
            products.createIndex("by-category", "category_id");
          }
          if (!db.objectStoreNames.contains("categories")) {
            const categories = db.createObjectStore("categories", {
              keyPath: "id",
            });
            categories.createIndex("by-order", "display_order");
          }
          if (!db.objectStoreNames.contains("orders")) {
            const orders = db.createObjectStore("orders", { keyPath: "id" });
            orders.createIndex("by-status", "order_status");
            orders.createIndex("by-created", "created_at");
          }
          if (!db.objectStoreNames.contains("inventory")) {
            db.createObjectStore("inventory", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("settings")) {
            db.createObjectStore("settings", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("session")) {
            db.createObjectStore("session", { keyPath: "id" });
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("customers")) {
            const customers = db.createObjectStore("customers", {
              keyPath: "id",
            });
            customers.createIndex("by-phone", "phone");
          }
        }
      },
    });
  }
  return dbPromise;
}

/** Cart drafts (bill in progress) */
export async function saveDraft(draft: PendingDraft) {
  const db = await getDb();
  await db.put("pending_drafts", draft);
}

export const saveCartDraft = saveDraft;

export async function listDrafts() {
  const db = await getDb();
  return db.getAll("pending_drafts");
}

export const listCartDrafts = listDrafts;

export async function getDraft(id: string) {
  const db = await getDb();
  return db.get("pending_drafts", id);
}

export async function deleteDraft(id: string) {
  const db = await getDb();
  await db.delete("pending_drafts", id);
}

export async function enqueueAction(
  action: Omit<OfflineAction, "id" | "created_at" | "synced">,
) {
  const db = await getDb();
  const item: OfflineAction = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    synced: false,
    ...action,
  };
  await db.put("offline_queue", item);
  return item;
}

export async function listPendingActions() {
  const db = await getDb();
  const all = await db.getAll("offline_queue");
  return all
    .filter((a) => !a.synced && !a.dead)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function listDeadActions() {
  const db = await getDb();
  const all = await db.getAll("offline_queue");
  return all.filter((a) => a.dead && !a.synced);
}

export async function findPendingCreateByClientId(clientOrderId: string) {
  const pending = await listPendingActions();
  return pending.find((a) => {
    if (a.type !== "CREATE_ORDER") return false;
    const p = a.payload as {
      localId?: string;
      input?: { client_order_id?: string };
    };
    return (
      p.localId === clientOrderId ||
      p.input?.client_order_id === clientOrderId
    );
  });
}

export async function markActionSynced(id: string) {
  const db = await getDb();
  const item = await db.get("offline_queue", id);
  if (!item) return;
  item.synced = true;
  item.dead = false;
  delete item.error;
  await db.put("offline_queue", item);
}

export async function markActionError(
  id: string,
  error: string,
  extra?: { attempts?: number; next_retry_at?: string; dead?: boolean },
) {
  const db = await getDb();
  const item = await db.get("offline_queue", id);
  if (!item) return;
  item.error = error;
  if (extra?.attempts != null) item.attempts = extra.attempts;
  if (extra?.next_retry_at) item.next_retry_at = extra.next_retry_at;
  if (extra?.dead) item.dead = true;
  await db.put("offline_queue", item);
}

export async function reviveDeadAction(id: string) {
  const db = await getDb();
  const item = await db.get("offline_queue", id);
  if (!item) return;
  item.dead = false;
  item.attempts = 0;
  delete item.next_retry_at;
  delete item.error;
  await db.put("offline_queue", item);
}

export async function discardAction(id: string) {
  const db = await getDb();
  await db.delete("offline_queue", id);
}

export async function pruneSyncedActions(keepLast = 50) {
  const db = await getDb();
  const all = await db.getAll("offline_queue");
  const synced = all
    .filter((a) => a.synced)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const item of synced.slice(keepLast)) {
    await db.delete("offline_queue", item.id);
  }
  // Never delete dead order sync actions — those payloads are the only way
  // to upload after a long outage. Cap only unrelated dead items.
  const orderTypes = new Set([
    "CREATE_ORDER",
    "COMPLETE_ORDER",
    "CANCEL_ORDER",
    "UPDATE_ORDER",
  ]);
  const deadOther = all
    .filter((a) => a.dead && !a.synced && !orderTypes.has(a.type))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const item of deadOther.slice(50)) {
    await db.delete("offline_queue", item.id);
  }
}

const ID_MAP_KEY = "order_id_map";

export async function mapLocalToServerId(localId: string, serverId: string) {
  const map = (await cacheGet<Record<string, string>>(ID_MAP_KEY)) || {};
  map[localId] = serverId;
  const entries = Object.entries(map);
  if (entries.length <= 500) {
    await cacheSet(ID_MAP_KEY, map);
    return;
  }
  // Prefer keeping ids still referenced by the offline queue.
  const queue = await listPendingActions();
  const dead = await listDeadActions();
  const needed = new Set<string>();
  for (const a of [...queue, ...dead]) {
    const p = a.payload as { localId?: string; id?: string };
    if (p.localId) needed.add(p.localId);
    if (p.id) needed.add(p.id);
  }
  needed.add(localId);
  const keep: [string, string][] = [];
  const rest: [string, string][] = [];
  for (const entry of entries) {
    if (needed.has(entry[0]) || needed.has(entry[1])) keep.push(entry);
    else rest.push(entry);
  }
  const trimmed = Object.fromEntries([
    ...keep,
    ...rest.slice(-(400 - Math.min(keep.length, 400))),
  ].slice(-500));
  await cacheSet(ID_MAP_KEY, trimmed);
}

export async function resolveServerOrderId(id: string): Promise<string> {
  const map = (await cacheGet<Record<string, string>>(ID_MAP_KEY)) || {};
  return map[id] || id;
}

export async function pruneCacheKeys(keepKeys: string[]) {
  const db = await getDb();
  const all = await db.getAll("cache");
  const keep = new Set(keepKeys);
  for (const row of all) {
    if (!keep.has(row.key) && !row.key.startsWith("sync_")) {
      // keep known operational keys
      const operational = [
        "products",
        "categories",
        "orders",
        "inventory",
        "settings",
        "session",
        "customers",
        "locations",
        "offers",
        "recipes",
        "sync_meta",
        "sync_conflicts",
        "order_id_map",
      ];
      if (!operational.includes(row.key)) {
        await db.delete("cache", row.key);
      }
    }
  }
}

export async function cacheSet(key: string, data: unknown) {
  const db = await getDb();
  await db.put("cache", {
    key,
    data,
    updated_at: new Date().toISOString(),
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.get("cache", key);
  return (row?.data as T) ?? null;
}

export async function replaceProducts(products: Product[]) {
  const db = await getDb();
  const tx = db.transaction("products", "readwrite");
  await tx.store.clear();
  for (const p of products) await tx.store.put(p);
  await tx.done;
  await cacheSet("products", products);
}

export async function listLocalProducts() {
  const db = await getDb();
  const rows = await db.getAll("products");
  if (rows.length) return rows;
  return (await cacheGet<Product[]>("products")) || [];
}

export async function replaceCategories(categories: Category[]) {
  const db = await getDb();
  const tx = db.transaction("categories", "readwrite");
  await tx.store.clear();
  for (const c of categories) await tx.store.put(c);
  await tx.done;
  await cacheSet("categories", categories);
}

export async function listLocalCategories() {
  const db = await getDb();
  const rows = await db.getAll("categories");
  if (rows.length) return rows;
  return (await cacheGet<Category[]>("categories")) || [];
}

function capOrdersKeepingUnsynced(orders: Order[], limit = 2000): Order[] {
  const sorted = orders
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const unsynced = sorted.filter(
    (o) => o.sync_status === "pending_sync" || o.sync_status === "local",
  );
  const rest = sorted.filter(
    (o) => o.sync_status !== "pending_sync" && o.sync_status !== "local",
  );
  const kept = [...unsynced];
  const seen = new Set(kept.map((o) => o.id));
  for (const row of rest) {
    if (kept.length >= limit) break;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    kept.push(row);
  }
  return kept.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function replaceOrders(orders: Order[]) {
  const db = await getDb();
  const capped = capOrdersKeepingUnsynced(orders);
  const tx = db.transaction("orders", "readwrite");
  await tx.store.clear();
  for (const o of capped) await tx.store.put(o);
  await tx.done;
  await cacheSet("orders", capped);
  await rebuildCustomersFromOrders(capped);
}

/** Keep local COMPLETED sales for this many Karachi calendar days past today. */
const PRESERVE_COMPLETED_DAYS = 45;

function orderCreatedMs(order: Order): number {
  return Date.parse(order.created_at || "") || 0;
}

/**
 * Replace IDB orders from a server snapshot while keeping:
 * - unsynced local rows (offline creates / pending status changes)
 * - recent local COMPLETED/CANCELLED that fell off the server's limit=100 window
 *   (otherwise dashboard/history sales silently shrink on busy days)
 */
export async function replaceOrdersPreservingUnsynced(serverOrders: Order[]) {
  const { findOrderByIdentity, ordersShareIdentity, preferEarlierCreatedAt } =
    await import("@/lib/order-identity");
  const existing = await listLocalOrders();
  const idMap =
    (await cacheGet<Record<string, string>>(ID_MAP_KEY)) || {};
  const serverIds = new Set(serverOrders.map((r) => r.id));
  const serverClientIds = new Set(
    serverOrders
      .map((r) => r.client_order_id)
      .filter((id): id is string => Boolean(id)),
  );
  const mappedServerIds = new Set(Object.values(idMap));

  const preserveAfterMs =
    Date.now() - PRESERVE_COMPLETED_DAYS * 24 * 60 * 60 * 1000;

  const unsynced = existing.filter((o) => {
    const pendingLocal =
      o.sync_status === "pending_sync" || o.sync_status === "local";
    if (!pendingLocal) return false;
    // Drop LOCAL-* once server already has the same client_order_id.
    if (o.client_order_id && serverClientIds.has(o.client_order_id)) {
      return false;
    }
    if (idMap[o.id] && serverIds.has(idMap[o.id])) return false;
    if (serverIds.has(o.id) && o.order_status === "PENDING") {
      // Server row wins for still-pending synced ids; keep local if status diverged.
      return false;
    }
    return !serverIds.has(o.id) || o.order_status !== "PENDING";
  });

  const recentTerminal = existing.filter((o) => {
    if (o.order_status !== "COMPLETED" && o.order_status !== "CANCELLED") {
      return false;
    }
    if (serverIds.has(o.id)) return false;
    if (o.client_order_id && serverClientIds.has(o.client_order_id)) {
      return false;
    }
    if (idMap[o.id] && serverIds.has(idMap[o.id])) return false;
    if (mappedServerIds.has(o.id)) return false;
    const created = orderCreatedMs(o);
    return created >= preserveAfterMs;
  });

  const byId = new Map<string, Order>();
  for (const s of serverOrders) {
    const loc = findOrderByIdentity(existing, s, idMap);
    const createdAt = loc
      ? preferEarlierCreatedAt(loc.created_at, s.created_at)
      : s.created_at;
    const clientOrderId =
      s.client_order_id || loc?.client_order_id || loc?.id || undefined;
    if (
      loc &&
      loc.sync_status === "pending_sync" &&
      (loc.order_status === "COMPLETED" || loc.order_status === "CANCELLED")
    ) {
      byId.set(s.id, {
        ...s,
        client_order_id: clientOrderId,
        created_at: createdAt,
        order_status: loc.order_status,
        sync_status: "pending_sync",
      });
    } else {
      byId.set(s.id, {
        ...s,
        client_order_id: clientOrderId,
        created_at: createdAt,
        sync_status: "synced" as const,
      });
    }
  }
  const identityTaken = (row: Order) =>
    [...byId.values()].some((existingRow) =>
      ordersShareIdentity(existingRow, row),
    );
  for (const o of unsynced) {
    if (!byId.has(o.id) && !identityTaken(o)) byId.set(o.id, o);
  }
  for (const o of recentTerminal) {
    if (!byId.has(o.id) && !identityTaken(o)) byId.set(o.id, o);
  }
  await replaceOrders(Array.from(byId.values()));
}

/** Upsert without wiping history — used by pending polls. Dedupes identities.
 *  Never lets a PENDING incoming row overwrite a local COMPLETED/CANCELLED twin.
 */
export async function mergeOrders(orders: Order[]) {
  const {
    dedupeOrdersByIdentity,
    ordersShareIdentity,
    preferEarlierCreatedAt,
  } = await import("@/lib/order-identity");
  const db = await getDb();
  const existing = await db.getAll("orders");
  const byId = new Map(existing.map((o) => [o.id, o]));

  for (const incoming of orders) {
    for (const [id, row] of [...byId.entries()]) {
      if (id === incoming.id) continue;
      if (ordersShareIdentity(row, incoming)) {
        // Keep terminal local twin; drop only if incoming is also terminal or pending twin of pending.
        if (
          (row.order_status === "COMPLETED" ||
            row.order_status === "CANCELLED") &&
          incoming.order_status === "PENDING"
        ) {
          // Do not delete the completed row — skip absorbing this pending identity.
          continue;
        }
        byId.delete(id);
      }
    }
    const previous = byId.get(incoming.id);
    const previousTerminal =
      previous &&
      (previous.order_status === "COMPLETED" ||
        previous.order_status === "CANCELLED");
    const identityTerminal = [...byId.values()].find(
      (row) =>
        ordersShareIdentity(row, incoming) &&
        (row.order_status === "COMPLETED" ||
          row.order_status === "CANCELLED"),
    );

    if (
      incoming.order_status === "PENDING" &&
      (previousTerminal || identityTerminal)
    ) {
      // Stale server PENDING must not resurrect a ticket the cashier finished.
      continue;
    }

    byId.set(
      incoming.id,
      previous
        ? {
            ...previous,
            ...incoming,
            client_order_id:
              incoming.client_order_id ||
              previous.client_order_id ||
              previous.id,
            created_at: preferEarlierCreatedAt(
              previous.created_at,
              incoming.created_at,
            ),
          }
        : incoming,
    );
  }

  const merged = capOrdersKeepingUnsynced(
    dedupeOrdersByIdentity(Array.from(byId.values())),
  );
  const tx = db.transaction("orders", "readwrite");
  await tx.store.clear();
  for (const o of merged) await tx.store.put(o);
  await tx.done;
  await cacheSet("orders", merged);
}

export async function upsertLocalOrder(order: Order) {
  const { ordersShareIdentity } = await import("@/lib/order-identity");
  const db = await getDb();
  const all = await db.getAll("orders");
  for (const row of all) {
    if (row.id !== order.id && ordersShareIdentity(row, order)) {
      await db.delete("orders", row.id);
    }
  }
  const existed = all.some(
    (row) => row.id === order.id || ordersShareIdentity(row, order),
  );
  await db.put("orders", order);
  const cached = (await cacheGet<Order[]>("orders")) || [];
  const next = [
    order,
    ...cached.filter(
      (o) => o.id !== order.id && !ordersShareIdentity(o, order),
    ),
  ].slice(0, 500);
  await cacheSet("orders", next);
  await upsertCustomerFromOrder(order, !existed);
}

export async function deleteLocalOrder(id: string) {
  const db = await getDb();
  await db.delete("orders", id);
  const cached = (await cacheGet<Order[]>("orders")) || [];
  await cacheSet(
    "orders",
    cached.filter((o) => o.id !== id),
  );
}

export async function listLocalOrders() {
  const { dedupeOrdersByIdentity } = await import("@/lib/order-identity");
  const db = await getDb();
  const rows = await db.getAll("orders");
  const source = rows.length
    ? rows
    : (await cacheGet<Order[]>("orders")) || [];
  return dedupeOrdersByIdentity(source);
}

export async function listLocalPendingOrders() {
  const all = await listLocalOrders();
  return all.filter((o) => o.order_status === "PENDING");
}

export async function replaceInventory(items: InventoryItem[]) {
  const db = await getDb();
  const tx = db.transaction("inventory", "readwrite");
  await tx.store.clear();
  for (const item of items) await tx.store.put(item);
  await tx.done;
  await cacheSet("inventory", items);
}

export async function listLocalInventory() {
  const db = await getDb();
  const rows = await db.getAll("inventory");
  if (rows.length) return rows;
  return (await cacheGet<InventoryItem[]>("inventory")) || [];
}

export async function saveLocalSettings(settings: Settings) {
  const db = await getDb();
  await db.put("settings", { ...settings, id: settings.id || "default" });
  await cacheSet("settings", settings);
}

export async function getLocalSettings() {
  const db = await getDb();
  const row = await db.get("settings", "default");
  if (row) {
    return row as Settings;
  }
  return cacheGet<Settings>("settings");
}

export async function saveSession(session: CachedSession) {
  const db = await getDb();
  await db.put("session", { ...session, id: "current" });
  await cacheSet("session", session);
}

export async function getSession() {
  const db = await getDb();
  const row = await db.get("session", "current");
  if (row) {
    return {
      username: row.username,
      token: row.token,
      exp: row.exp,
      saved_at: row.saved_at,
    };
  }
  return cacheGet<CachedSession>("session");
}

export async function clearSession() {
  const db = await getDb();
  await db.delete("session", "current");
  await cacheSet("session", null);
}

export async function replaceCustomers(customers: Customer[]) {
  const db = await getDb();
  const tx = db.transaction("customers", "readwrite");
  await tx.store.clear();
  for (const c of customers) await tx.store.put(c);
  await tx.done;
  await cacheSet("customers", customers);
}

export async function listLocalCustomers() {
  const db = await getDb();
  const rows = await db.getAll("customers");
  if (rows.length) return rows;
  return (await cacheGet<Customer[]>("customers")) || [];
}

async function upsertCustomerFromOrder(order: Order, isNewOrder: boolean) {
  if (!order.phone || order.phone === "0000000000") return;
  const { normalizePkPhone } = await import("@/lib/utils");
  const phone = normalizePkPhone(order.phone);
  if (!phone || phone === "0000000000") return;
  const db = await getDb();
  const id = order.customer_id || `phone:${phone}`;
  const existing = await db.get("customers", id);
  const newer =
    !existing || order.created_at >= existing.last_order_at;
  const customer: Customer = {
    id,
    name: newer
      ? order.customer_name || existing?.name || "Customer"
      : existing.name,
    phone,
    address: newer
      ? order.address || existing?.address || ""
      : existing.address,
    last_order_at: newer ? order.created_at : existing.last_order_at,
    order_count: isNewOrder
      ? (existing?.order_count || 0) + 1
      : existing?.order_count || 1,
    last_location_id: newer
      ? order.location_id || existing?.last_location_id
      : existing?.last_location_id,
  };
  await db.put("customers", customer);
  const all = await db.getAll("customers");
  await cacheSet("customers", all);
}

async function rebuildCustomersFromOrders(orders: Order[]) {
  const { normalizePkPhone } = await import("@/lib/utils");
  const map = new Map<string, Customer>();
  for (const order of orders) {
    if (!order.phone || order.phone === "0000000000") continue;
    const phone = normalizePkPhone(order.phone);
    if (!phone || phone === "0000000000") continue;
    const id = order.customer_id || `phone:${phone}`;
    const prev = map.get(id);
    if (!prev) {
      map.set(id, {
        id,
        name: order.customer_name || "Customer",
        phone,
        address: order.address || "",
        last_order_at: order.created_at,
        order_count: 1,
        last_location_id: order.location_id || undefined,
      });
    } else {
      prev.order_count += 1;
      if (order.created_at > prev.last_order_at) {
        prev.last_order_at = order.created_at;
        prev.name = order.customer_name || prev.name;
        prev.address = order.address || prev.address;
        if (order.location_id) prev.last_location_id = order.location_id;
      }
    }
  }
  await replaceCustomers(Array.from(map.values()));
}

/** Prefix search on cached customers (normalized PK digits). */
export async function searchLocalCustomersByPhone(
  query: string,
  limit = 12,
): Promise<Customer[]> {
  const { normalizePkPhone } = await import("@/lib/utils");
  const digits = normalizePkPhone(query);
  if (digits.length < 4 || digits === "0000000000") return [];

  const all = await listLocalCustomers();
  const matches = all
    .filter((c) => {
      const phone = normalizePkPhone(c.phone || "");
      return (
        phone.length >= 4 &&
        phone !== "0000000000" &&
        phone.startsWith(digits)
      );
    })
    .sort((a, b) =>
      (b.last_order_at || "").localeCompare(a.last_order_at || ""),
    );

  return matches.slice(0, limit);
}

/** Upsert remote lookup rows into the local customers store. */
export async function upsertCustomersFromLookup(
  rows: Array<{
    phone: string;
    name: string;
    address: string;
    location_id?: string | null;
    last_order_at: string;
    order_count: number;
  }>,
) {
  if (!rows.length) return;
  const { normalizePkPhone } = await import("@/lib/utils");
  const db = await getDb();
  for (const row of rows) {
    const phone = normalizePkPhone(row.phone);
    if (!phone || phone === "0000000000") continue;
    const id = `phone:${phone}`;
    const existing = await db.get("customers", id);
    const newer =
      !existing ||
      (row.last_order_at || "") >= (existing.last_order_at || "");
    const customer: Customer = {
      id,
      name: newer
        ? row.name || existing?.name || "Customer"
        : existing.name,
      phone,
      address: newer
        ? row.address || existing?.address || ""
        : existing.address,
      last_order_at: newer
        ? row.last_order_at || existing?.last_order_at || new Date().toISOString()
        : existing.last_order_at,
      order_count: Math.max(row.order_count || 1, existing?.order_count || 1),
      last_location_id: newer
        ? row.location_id || existing?.last_location_id
        : existing?.last_location_id,
    };
    await db.put("customers", customer);
  }
  const all = await db.getAll("customers");
  await cacheSet("customers", all);
}
