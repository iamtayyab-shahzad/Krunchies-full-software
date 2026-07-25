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
  // Cap dead-letter items
  const dead = all
    .filter((a) => a.dead && !a.synced)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const item of dead.slice(30)) {
    await db.delete("offline_queue", item.id);
  }
}

const ID_MAP_KEY = "order_id_map";

export async function mapLocalToServerId(localId: string, serverId: string) {
  const map = (await cacheGet<Record<string, string>>(ID_MAP_KEY)) || {};
  map[localId] = serverId;
  // Keep map bounded
  const entries = Object.entries(map);
  if (entries.length > 500) {
    const trimmed = Object.fromEntries(entries.slice(-400));
    await cacheSet(ID_MAP_KEY, trimmed);
    return;
  }
  await cacheSet(ID_MAP_KEY, map);
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

export async function replaceOrders(orders: Order[]) {
  const db = await getDb();
  const capped = orders
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 500);
  const tx = db.transaction("orders", "readwrite");
  await tx.store.clear();
  for (const o of capped) await tx.store.put(o);
  await tx.done;
  await cacheSet("orders", capped);
  await rebuildCustomersFromOrders(capped);
}

/** Upsert without wiping history — used by pending polls. */
export async function mergeOrders(orders: Order[]) {
  const db = await getDb();
  const existing = await db.getAll("orders");
  const byId = new Map(existing.map((o) => [o.id, o]));
  for (const o of orders) byId.set(o.id, o);
  const merged = Array.from(byId.values())
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 500);
  const tx = db.transaction("orders", "readwrite");
  await tx.store.clear();
  for (const o of merged) await tx.store.put(o);
  await tx.done;
  await cacheSet("orders", merged);
}

export async function upsertLocalOrder(order: Order) {
  const db = await getDb();
  const existed = await db.get("orders", order.id);
  await db.put("orders", order);
  const cached = (await cacheGet<Order[]>("orders")) || [];
  const next = [order, ...cached.filter((o) => o.id !== order.id)].slice(0, 500);
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
  const db = await getDb();
  const rows = await db.getAll("orders");
  if (rows.length) return rows;
  return (await cacheGet<Order[]>("orders")) || [];
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
  const db = await getDb();
  const id = order.customer_id || `phone:${order.phone}`;
  const existing = await db.get("customers", id);
  const newer =
    !existing || order.created_at >= existing.last_order_at;
  const customer: Customer = {
    id,
    name: newer
      ? order.customer_name || existing?.name || "Customer"
      : existing.name,
    phone: order.phone,
    address: newer
      ? order.address || existing?.address || ""
      : existing.address,
    last_order_at: newer ? order.created_at : existing.last_order_at,
    order_count: isNewOrder
      ? (existing?.order_count || 0) + 1
      : existing?.order_count || 1,
  };
  await db.put("customers", customer);
  const all = await db.getAll("customers");
  await cacheSet("customers", all);
}

async function rebuildCustomersFromOrders(orders: Order[]) {
  const map = new Map<string, Customer>();
  for (const order of orders) {
    if (!order.phone || order.phone === "0000000000") continue;
    const id = order.customer_id || `phone:${order.phone}`;
    const prev = map.get(id);
    if (!prev) {
      map.set(id, {
        id,
        name: order.customer_name || "Customer",
        phone: order.phone,
        address: order.address || "",
        last_order_at: order.created_at,
        order_count: 1,
      });
    } else {
      prev.order_count += 1;
      if (order.created_at > prev.last_order_at) {
        prev.last_order_at = order.created_at;
        prev.name = order.customer_name || prev.name;
        prev.address = order.address || prev.address;
      }
    }
  }
  await replaceCustomers(Array.from(map.values()));
}
