import { apiFetch } from "@/lib/api-client";
import {
  cacheGet,
  cacheSet,
  enqueueAction,
  listPendingActions,
  markActionError,
  markActionSynced,
} from "@/lib/offline-db";
import {
  krunchiesCategories,
  krunchiesOffers,
  krunchiesProducts,
} from "@/data/krunchies";
import type {
  Category,
  CreateOrderInput,
  InventoryItem,
  Location,
  Offer,
  Order,
  Product,
  ProductSize,
  Recipe,
  Settings,
  StaffLoginInput,
} from "@/types";

async function withCacheFallback<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const data = await fetcher();
    await cacheSet(key, data);
    return data;
  } catch (err) {
    const cached = await cacheGet<T>(key);
    if (cached) return cached;
    throw err;
  }
}

export const authApi = {
  login: (input: StaffLoginInput) =>
    apiFetch<{ token: string }>("/auth/staff/login", {
      method: "POST",
      body: JSON.stringify(input),
    }, false),
};

export async function syncKrunchiesMenu() {
  const [remoteCategories, remoteProducts, remoteSizes, remoteOffers] =
    await Promise.all([
    apiFetch<Category[]>("/categories"),
    apiFetch<Product[]>("/products"),
    apiFetch<ProductSize[]>("/product-sizes"),
    apiFetch<Offer[]>("/offers"),
  ]);
  const categoryIds = new Set(remoteCategories.map((item) => item.id));
  const productIds = new Set(remoteProducts.map((item) => item.id));
  const sizesById = new Map(remoteSizes.map((item) => [item.id, item]));
  const offerIds = new Set(remoteOffers.map((item) => item.id));

  const shouldSeedCatalog =
    remoteCategories.length === 0 ||
    remoteProducts.length === 0 ||
    remoteSizes.length === 0;
  const shouldSeedOffers = remoteOffers.length === 0;

  // Seeding is "create missing" only. Once Admin has data, we avoid overwriting it.
  if (shouldSeedCatalog) {
    await Promise.all(
      krunchiesCategories.map((category) => {
        if (categoryIds.has(category.id)) return Promise.resolve(null);
        const payload = {
          id: category.id,
          name: category.name,
          image: category.image,
          display_order: category.display_order,
          visible: category.visible,
        };
        return apiFetch<Category>("/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }),
    );

    await Promise.all(
      krunchiesProducts.map((product) => {
        if (productIds.has(product.id)) return Promise.resolve(null);
        const payload = {
          id: product.id,
          category_id: product.category_id,
          name: product.name,
          description: product.description,
          image: product.image,
          featured: product.featured,
          available: product.available,
          display_order: product.display_order,
        };
        return apiFetch<Product>("/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }),
    );

    await Promise.all(
      krunchiesProducts.flatMap((product) =>
        (product.sizes ?? []).map((size) => {
          if (sizesById.has(size.id)) return Promise.resolve(null);
          const payload = {
            id: size.id,
            product_id: size.product_id,
            size: size.size,
            price: size.price,
          };
          return apiFetch<ProductSize>("/product-sizes", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }),
      ),
    );
  }

  // Seed offers only when the backend has none.
  if (shouldSeedOffers) {
    await Promise.all(
      krunchiesOffers.map((offer) => {
        if (offerIds.has(offer.id)) return Promise.resolve(null);
        const isPromotion = Boolean(offer.start_date || offer.end_date);
        const payload = {
          id: offer.id,
          title: offer.title,
          description: offer.description,
          image: offer.image,
          active: offer.active,
          start_date: offer.start_date,
          end_date: offer.end_date,
          // Backfill flags for Website offer-popup & Admin toggles.
          offer_popup: isPromotion,
          homepage_deal: true,
          discount_label: offer.title,
        };
        return apiFetch<Offer>("/offers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }),
    );
  }
}

export const productsApi = {
  list: async () => {
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
  get: async (id: string) => {
    const product = krunchiesProducts.find((item) => item.id === id);
    if (!product) throw new Error("Product not found");
    return product;
  },
  create: async (payload: Partial<Product>) => {
    try {
      return await apiFetch<Product>("/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (e) {
      await enqueueAction({ type: "CREATE_PRODUCT", payload });
      throw e;
    }
  },
  update: async (id: string, updates: Record<string, unknown>) => {
    try {
      return await apiFetch<null>(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    } catch (e) {
      await enqueueAction({
        type: "UPDATE_PRODUCT",
        payload: { id, updates },
      });
      throw e;
    }
  },
  remove: (id: string) =>
    apiFetch<null>(`/products/${id}`, { method: "DELETE" }),
};

export const productSizesApi = {
  list: () => apiFetch<ProductSize[]>("/product-sizes"),
  create: (payload: Partial<ProductSize>) =>
    apiFetch<ProductSize>("/product-sizes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, updates: Record<string, unknown>) =>
    apiFetch<null>(`/product-sizes/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  remove: (id: string) =>
    apiFetch<null>(`/product-sizes/${id}`, { method: "DELETE" }),
};

export const categoriesApi = {
  list: async () => apiFetch<Category[]>("/categories"),
  create: async (payload: Partial<Category>) => {
    try {
      return await apiFetch<Category>("/categories", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (e) {
      await enqueueAction({ type: "CREATE_CATEGORY", payload });
      throw e;
    }
  },
  update: async (id: string, updates: Record<string, unknown>) => {
    try {
      return await apiFetch<null>(`/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    } catch (e) {
      await enqueueAction({
        type: "UPDATE_CATEGORY",
        payload: { id, updates },
      });
      throw e;
    }
  },
  remove: (id: string) =>
    apiFetch<null>(`/categories/${id}`, { method: "DELETE" }),
};

export const locationsApi = {
  list: () =>
    withCacheFallback("locations", () => apiFetch<Location[]>("/locations")),
  create: (payload: Partial<Location>) =>
    apiFetch<Location>("/locations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, updates: Record<string, unknown>) =>
    apiFetch<null>(`/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  remove: (id: string) =>
    apiFetch<null>(`/locations/${id}`, { method: "DELETE" }),
};

export const ordersApi = {
  list: () =>
    withCacheFallback("orders", () => apiFetch<Order[]>("/orders")),
  pending: () => apiFetch<Order[]>("/orders/pending"),
  get: (id: string) => apiFetch<Order>(`/orders/${id}`),
  create: async (input: CreateOrderInput, orderType: "walkin" | "phone" | "website" = "walkin") => {
    const path =
      orderType === "phone"
        ? "/orders/phone"
        : orderType === "walkin"
          ? "/orders/walkin"
          : "/orders";
    try {
      return await apiFetch<Order>(path, {
        method: "POST",
        body: JSON.stringify(input),
      });
    } catch (e) {
      await enqueueAction({
        type: "CREATE_ORDER",
        payload: { input, orderType },
      });
      throw e;
    }
  },
  update: (id: string, updates: Record<string, unknown>) =>
    apiFetch<null>(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  complete: async (id: string) => {
    try {
      return await apiFetch<null>(`/orders/${id}/complete`, { method: "PATCH" });
    } catch (e) {
      await enqueueAction({ type: "COMPLETE_ORDER", payload: { id } });
      throw e;
    }
  },
  cancel: async (id: string) => {
    try {
      return await apiFetch<null>(`/orders/${id}/cancel`, { method: "PATCH" });
    } catch (e) {
      await enqueueAction({ type: "CANCEL_ORDER", payload: { id } });
      throw e;
    }
  },
};

export const inventoryApi = {
  list: () =>
    withCacheFallback("inventory", () =>
      apiFetch<InventoryItem[]>("/inventory"),
    ),
  create: async (payload: Partial<InventoryItem>) => {
    try {
      return await apiFetch<InventoryItem>("/inventory", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (e) {
      await enqueueAction({ type: "CREATE_INVENTORY", payload });
      throw e;
    }
  },
  update: async (id: string, updates: Record<string, unknown>) => {
    try {
      return await apiFetch<null>(`/inventory/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    } catch (e) {
      await enqueueAction({
        type: "UPDATE_INVENTORY",
        payload: { id, updates },
      });
      throw e;
    }
  },
  remove: (id: string) =>
    apiFetch<null>(`/inventory/${id}`, { method: "DELETE" }),
};

export const recipesApi = {
  list: () => apiFetch<Recipe[]>("/recipes"),
  create: (payload: Partial<Recipe>) =>
    apiFetch<Recipe>("/recipes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, updates: Record<string, unknown>) =>
    apiFetch<null>(`/recipes/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  remove: (id: string) =>
    apiFetch<null>(`/recipes/${id}`, { method: "DELETE" }),
};

export const offersApi = {
  list: async () => apiFetch<Offer[]>("/offers"),
  create: async (payload: Partial<Offer>) => {
    try {
      return await apiFetch<Offer>("/offers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (e) {
      await enqueueAction({ type: "CREATE_OFFER", payload });
      throw e;
    }
  },
  update: async (id: string, updates: Record<string, unknown>) => {
    try {
      return await apiFetch<null>(`/offers/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    } catch (e) {
      await enqueueAction({ type: "UPDATE_OFFER", payload: { id, updates } });
      throw e;
    }
  },
  enable: (id: string) =>
    apiFetch<null>(`/offers/${id}/enable`, { method: "PATCH" }),
  disable: (id: string) =>
    apiFetch<null>(`/offers/${id}/disable`, { method: "PATCH" }),
  remove: (id: string) =>
    apiFetch<null>(`/offers/${id}`, { method: "DELETE" }),
};

export const settingsApi = {
  get: async () =>
    withCacheFallback("settings", () => apiFetch<Settings>("/settings/public")),
  update: async (updates: Record<string, unknown>) => {
    try {
      return await apiFetch<Settings>("/settings", {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    } catch (e) {
      await enqueueAction({ type: "UPDATE_SETTINGS", payload: updates });
      throw e;
    }
  },
};

export const analyticsApi = {
  todaySales: () =>
    apiFetch<{ total: number }>("/analytics/today-sales"),
  yesterdaySales: () =>
    apiFetch<{ total: number }>("/analytics/yesterday-sales"),
  weeklySales: () =>
    apiFetch<{ total: number }>("/analytics/weekly-sales"),
  monthlySales: () =>
    apiFetch<{ total: number }>("/analytics/monthly-sales"),
  bestSelling: () =>
    apiFetch<Record<string, unknown>[]>("/analytics/best-selling-products"),
  cancelled: () =>
    apiFetch<{ count: number }>("/analytics/cancelled-orders"),
  paymentBreakdown: () =>
    apiFetch<Record<string, unknown>[]>("/analytics/payment-breakdown"),
  remainingInventory: () =>
    apiFetch<unknown>("/analytics/remaining-inventory"),
};

export async function syncOfflineQueue() {
  const pending = await listPendingActions();
  for (const action of pending) {
    try {
      switch (action.type) {
        case "CREATE_ORDER": {
          const p = action.payload as {
            input: CreateOrderInput;
            orderType: "walkin" | "phone" | "website";
          };
          const path =
            p.orderType === "phone"
              ? "/orders/phone"
              : p.orderType === "walkin"
                ? "/orders/walkin"
                : "/orders";
          await apiFetch(path, {
            method: "POST",
            body: JSON.stringify(p.input),
          });
          break;
        }
        case "COMPLETE_ORDER":
          await apiFetch(`/orders/${(action.payload as { id: string }).id}/complete`, {
            method: "PATCH",
          });
          break;
        case "CANCEL_ORDER":
          await apiFetch(`/orders/${(action.payload as { id: string }).id}/cancel`, {
            method: "PATCH",
          });
          break;
        case "CREATE_PRODUCT":
          await apiFetch("/products", {
            method: "POST",
            body: JSON.stringify(action.payload),
          });
          break;
        case "UPDATE_PRODUCT": {
          const p = action.payload as { id: string; updates: Record<string, unknown> };
          await apiFetch(`/products/${p.id}`, {
            method: "PUT",
            body: JSON.stringify(p.updates),
          });
          break;
        }
        case "CREATE_CATEGORY":
          await apiFetch("/categories", {
            method: "POST",
            body: JSON.stringify(action.payload),
          });
          break;
        case "UPDATE_CATEGORY": {
          const p = action.payload as { id: string; updates: Record<string, unknown> };
          await apiFetch(`/categories/${p.id}`, {
            method: "PUT",
            body: JSON.stringify(p.updates),
          });
          break;
        }
        case "CREATE_INVENTORY":
          await apiFetch("/inventory", {
            method: "POST",
            body: JSON.stringify(action.payload),
          });
          break;
        case "UPDATE_INVENTORY": {
          const p = action.payload as { id: string; updates: Record<string, unknown> };
          await apiFetch(`/inventory/${p.id}`, {
            method: "PUT",
            body: JSON.stringify(p.updates),
          });
          break;
        }
        case "UPDATE_SETTINGS":
          await apiFetch("/settings", {
            method: "PUT",
            body: JSON.stringify(action.payload),
          });
          break;
        case "CREATE_OFFER":
          await apiFetch("/offers", {
            method: "POST",
            body: JSON.stringify(action.payload),
          });
          break;
        case "UPDATE_OFFER": {
          const p = action.payload as { id: string; updates: Record<string, unknown> };
          await apiFetch(`/offers/${p.id}`, {
            method: "PUT",
            body: JSON.stringify(p.updates),
          });
          break;
        }
      }
      await markActionSynced(action.id);
    } catch (err) {
      await markActionError(
        action.id,
        err instanceof Error ? err.message : "Sync failed",
      );
    }
  }
}
