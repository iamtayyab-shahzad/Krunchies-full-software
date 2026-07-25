import { apiFetch } from "@/lib/api-client";
import { isNetworkError, isOnline } from "@/lib/network";
import {
  listLocalCategories,
  listLocalCustomers,
  listLocalInventory,
  listLocalOrders,
  listLocalPendingOrders,
  listLocalProducts,
  getLocalSettings,
  replaceCategories,
  replaceInventory,
  replaceOrders,
  mergeOrders,
  replaceProducts,
  saveLocalSettings,
  saveSession,
  getSession,
  clearSession,
  type CachedSession,
} from "@/lib/offline-db";
import type {
  Category,
  Customer,
  InventoryItem,
  Order,
  Product,
  ProductSize,
  Settings,
} from "@/types";

async function onlineFirst<T>(
  fetchRemote: () => Promise<T>,
  readLocal: () => Promise<T | null | undefined>,
  writeLocal: (data: T) => Promise<void>,
  empty: T,
): Promise<T> {
  if (isOnline()) {
    try {
      const data = await fetchRemote();
      await writeLocal(data);
      return data;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const local = await readLocal();
      if (local != null) return local;
      throw err;
    }
  }
  const local = await readLocal();
  if (local != null) return local;
  return empty;
}

export const catalogRepo = {
  async listProducts(): Promise<Product[]> {
    return onlineFirst(
      async () => {
        const [remoteProducts, remoteSizes] = await Promise.all([
          apiFetch<Product[]>("/products"),
          apiFetch<ProductSize[]>("/product-sizes"),
        ]);
        const sizesByProduct = new Map<string, ProductSize[]>();
        for (const s of remoteSizes) {
          const arr = sizesByProduct.get(s.product_id) || [];
          arr.push(s);
          sizesByProduct.set(s.product_id, arr);
        }
        return remoteProducts.map((p) => ({
          ...p,
          sizes: sizesByProduct.get(p.id) || [],
        }));
      },
      listLocalProducts,
      replaceProducts,
      [],
    );
  },

  async listCategories(): Promise<Category[]> {
    return onlineFirst(
      () => apiFetch<Category[]>("/categories"),
      listLocalCategories,
      replaceCategories,
      [],
    );
  },
};

export const ordersRepo = {
  async list(): Promise<Order[]> {
    return onlineFirst(
      async () => {
        const rows = await apiFetch<Order[]>("/orders");
        const existing = await listLocalOrders();
        const serverIds = new Set(rows.map((r) => r.id));
        // Preserve local orders the server doesn't know about yet (offline
        // creates) and local status changes that haven't synced, so a refetch
        // right after reconnect doesn't drop them before the sync completes.
        const unsynced = existing.filter(
          (o) =>
            (o.sync_status === "pending_sync" || o.sync_status === "local") &&
            (!serverIds.has(o.id) || o.order_status !== "PENDING"),
        );
        const byId = new Map(rows.map((o) => [o.id, o]));
        for (const o of unsynced) byId.set(o.id, o);
        const merged = Array.from(byId.values());
        await replaceOrders(merged);
        return merged;
      },
      listLocalOrders,
      replaceOrders,
      [],
    );
  },

  async pending(): Promise<Order[]> {
    return onlineFirst(
      async () => {
        const rows = await apiFetch<Order[]>("/orders/pending");
        const existing = await listLocalOrders();
        const localById = new Map(existing.map((o) => [o.id, o]));
        const byId = new Map(existing.map((o) => [o.id, o]));
        for (const row of rows) {
          const local = localById.get(row.id);
          // If we locally completed/cancelled an order that hasn't synced yet,
          // keep our local status instead of the server's stale PENDING copy so
          // the order doesn't reappear in the pending list.
          if (
            local &&
            local.sync_status === "pending_sync" &&
            local.order_status !== "PENDING"
          ) {
            byId.set(row.id, local);
          } else {
            byId.set(row.id, row);
          }
        }
        for (const o of existing) {
          if (
            o.order_status === "PENDING" &&
            o.order_number.startsWith("LOCAL-")
          ) {
            byId.set(o.id, o);
          }
        }
        const pending = Array.from(byId.values()).filter(
          (o) => o.order_status === "PENDING",
        );
        await mergeOrders(pending);
        return pending;
      },
      listLocalPendingOrders,
      async () => {
        /* pending write handled above */
      },
      [],
    );
  },

  async get(id: string): Promise<Order> {
    if (isOnline()) {
      try {
        return await apiFetch<Order>(`/orders/${id}`);
      } catch (err) {
        if (!isNetworkError(err)) {
          const local = (await listLocalOrders()).find((o) => o.id === id);
          if (local) return local;
          throw err;
        }
      }
    }
    const local = (await listLocalOrders()).find((o) => o.id === id);
    if (!local) throw new Error("Order not found offline");
    return local;
  },
};

export const inventoryRepo = {
  async list(): Promise<InventoryItem[]> {
    return onlineFirst(
      () => apiFetch<InventoryItem[]>("/inventory"),
      listLocalInventory,
      replaceInventory,
      [],
    );
  },
};

export const settingsRepo = {
  async get(): Promise<Settings> {
    return onlineFirst(
      () => apiFetch<Settings>("/settings/public"),
      getLocalSettings,
      async (data) => {
        if (data) await saveLocalSettings(data);
      },
      {
        id: "default",
        created_at: "",
        updated_at: "",
        restaurant_name: "Krunchies Pizza",
        phone: "",
        whatsapp: "",
        logo: "",
        opening_time: "11:00 AM",
        closing_time: "11:00 PM",
        cash_on_delivery_fee: 0,
        currency: "Rs",
        google_maps: "",
        facebook: "",
        instagram: "",
      },
    );
  },
};

export const customersRepo = {
  async list(): Promise<Customer[]> {
    return onlineFirst(
      async () => {
        // Derive from orders (no dedicated customers API on POS).
        const orders = await apiFetch<Order[]>("/orders");
        await replaceOrders(orders);
        return listLocalCustomers();
      },
      listLocalCustomers,
      async () => {
        /* rebuilt via replaceOrders */
      },
      [],
    );
  },
};

export const sessionRepo = {
  save: saveSession,
  get: getSession,
  clear: clearSession,
  async cacheFromToken(username: string, token: string) {
    let exp: number | null = null;
    try {
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      exp = typeof payload.exp === "number" ? payload.exp : null;
    } catch {
      exp = null;
    }
    const session: CachedSession = {
      username,
      token,
      exp,
      saved_at: new Date().toISOString(),
    };
    await saveSession(session);
    return session;
  },
};

export const locationsRepo = {
  async list() {
    const { cacheGet, cacheSet } = await import("@/lib/offline-db");
    if (isOnline()) {
      try {
        const data = await apiFetch<
          import("@/types").Location[]
        >("/locations");
        await cacheSet("locations", data);
        return data;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        return (await cacheGet<import("@/types").Location[]>("locations")) || [];
      }
    }
    return (await cacheGet<import("@/types").Location[]>("locations")) || [];
  },
};

/** Prefetch core datasets into IndexedDB while online. */
export async function warmOfflineCache() {
  if (!isOnline()) return;
  await Promise.allSettled([
    catalogRepo.listProducts(),
    catalogRepo.listCategories(),
    ordersRepo.list(),
    inventoryRepo.list(),
    settingsRepo.get(),
    locationsRepo.list(),
  ]);
}
