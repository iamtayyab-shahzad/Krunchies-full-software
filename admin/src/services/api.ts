import { apiFetch } from "@/lib/api-client";
import type {
  Category,
  Deal,
  InventoryItem,
  PizzaSize,
  Product,
} from "@/lib/mock-data";

type BackendCategory = {
  id: string;
  name: string;
  image: string;
  display_order: number;
  visible: boolean;
};

type BackendProduct = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  image: string;
  featured: boolean;
  available: boolean;
  display_order: number;
};

type BackendProductSize = {
  id: string;
  product_id: string;
  size: string;
  price: number;
};

type BackendOffer = {
  id: string;
  title: string;
  description: string;
  image: string;
  active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  offer_popup: boolean;
  homepage_deal: boolean;
  discount_label: string;
};

type BackendInventory = {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  purchase_price: number;
  minimum_stock: number;
  supplier: string;
};

type BackendInventoryTransaction = {
  id: string;
  inventory_id: string;
  quantity: number;
  transaction_type: string;
  reason: string;
  created_at: string;
  inventory?: { id: string; name: string };
};

type BackendRecipe = {
  id: string;
  product_id: string;
  inventory_id: string;
  quantity_required: number;
};

export type BackendOrderItem = {
  id: string;
  product_id: string;
  product_size_id: string;
  quantity: number;
  price: number;
  special_instructions?: string;
  product?: { id: string; name: string };
  product_size?: { id: string; size: string; price: number };
};

export type BackendOrder = {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  phone: string;
  address: string;
  location_id: string;
  delivery_charge: number;
  cash_on_delivery_fee: number;
  payment_method: string;
  order_status: "PENDING" | "COMPLETED" | "CANCELLED";
  order_type: string;
  order_notes: string;
  subtotal: number;
  grand_total: number;
  items: BackendOrderItem[];
  created_at: string;
  updated_at: string;
};

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function mapCategory(cat: BackendCategory): Category {
  return {
    id: cat.id,
    name: cat.name,
    slug: slugify(cat.name),
    image: cat.image,
    displayOrder: cat.display_order,
    hidden: !cat.visible,
  };
}

function mapProduct(p: BackendProduct, sizes: BackendProductSize[]): Product {
  const pizzaSizes: PizzaSize[] = sizes.map((s) => ({
    id: s.id,
    label: s.size,
    price: s.price,
  }));
  const basePrice = pizzaSizes[0]?.price ?? 0;
  return {
    id: p.id,
    name: p.name,
    categoryId: p.category_id,
    description: p.description,
    image: p.image,
    available: p.available,
    featured: p.featured,
    basePrice,
    pizzaSizes,
  };
}

function mapOffer(o: BackendOffer): Deal {
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    image: o.image,
    enabled: o.active,
    offerPopup: o.offer_popup,
    homepageDeal: o.homepage_deal,
    discountLabel: o.discount_label,
  };
}

function mapInventory(i: BackendInventory): InventoryItem {
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    currentStock: i.stock,
    unit: i.unit,
    purchasePrice: i.purchase_price,
    minimumStock: i.minimum_stock,
    supplier: i.supplier,
  };
}

async function fetchAllProductSizes(): Promise<BackendProductSize[]> {
  return apiFetch<BackendProductSize[]>("/product-sizes");
}

export const categoriesApi = {
  list: async () => {
    const cats = await apiFetch<BackendCategory[]>("/categories");
    return cats.map(mapCategory).sort((a, b) => a.displayOrder - b.displayOrder);
  },
  create: async (payload: {
    name: string;
    image: string;
    displayOrder: number;
    hidden: boolean;
  }) => {
    await apiFetch<unknown>("/categories", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        image: payload.image,
        display_order: Number(payload.displayOrder || 0),
        visible: !payload.hidden,
      }),
    });
  },
  update: async (
    id: string,
    payload: { name: string; image: string; displayOrder: number; hidden: boolean },
  ) => {
    await apiFetch<unknown>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: payload.name,
        image: payload.image,
        display_order: Number(payload.displayOrder || 0),
        visible: !payload.hidden,
      }),
    });
  },
  remove: async (id: string) => {
    await apiFetch<unknown>(`/categories/${id}`, { method: "DELETE" });
  },
};

export const productsApi = {
  list: async (): Promise<Product[]> => {
    const [products, sizes] = await Promise.all([
      apiFetch<BackendProduct[]>("/products"),
      fetchAllProductSizes(),
    ]);
    const sizesByProduct = new Map<string, BackendProductSize[]>();
    for (const s of sizes) {
      const arr = sizesByProduct.get(s.product_id) || [];
      arr.push(s);
      sizesByProduct.set(s.product_id, arr);
    }
    return products
      .sort((a, b) => a.display_order - b.display_order)
      .map((p) => mapProduct(p, sizesByProduct.get(p.id) || []));
  },
  create: async (payload: Omit<Product, "id" | "basePrice">) => {
    // Create product first (backend assigns id if omitted)
    const created = await apiFetch<BackendProduct>("/products", {
      method: "POST",
      body: JSON.stringify({
        category_id: payload.categoryId,
        name: payload.name,
        description: payload.description,
        image: payload.image,
        featured: payload.featured,
        available: payload.available,
      }),
    });

    for (const s of payload.pizzaSizes || []) {
      await apiFetch<BackendProductSize>("/product-sizes", {
        method: "POST",
        body: JSON.stringify({
          product_id: created.id,
          size: s.label,
          price: Number(s.price || 0),
        }),
      });
    }
  },
  update: async (
    id: string,
    payload: {
      categoryId: string;
      name: string;
      description: string;
      image: string;
      featured: boolean;
      available: boolean;
      pizzaSizes: PizzaSize[];
    },
  ) => {
    await apiFetch<unknown>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        category_id: payload.categoryId,
        name: payload.name,
        description: payload.description,
        image: payload.image,
        featured: payload.featured,
        available: payload.available,
      }),
    });

    const allSizes = await fetchAllProductSizes();
    const existing = allSizes.filter((s) => s.product_id === id);
    const desiredLabels = new Set(
      (payload.pizzaSizes || []).map((s) => s.label.trim()).filter(Boolean),
    );

    // Delete removed sizes
    for (const e of existing) {
      const label = e.size.trim();
      if (!desiredLabels.has(label)) {
        await apiFetch<unknown>(`/product-sizes/${e.id}`, { method: "DELETE" });
      }
    }

    // Create/update desired sizes
    for (const d of payload.pizzaSizes || []) {
      const label = d.label.trim();
      if (!label) continue;
      const match = existing.find(
        (e) => e.size.trim().toLowerCase() === label.toLowerCase(),
      );
      if (match) {
        await apiFetch<unknown>(`/product-sizes/${match.id}`, {
          method: "PUT",
          body: JSON.stringify({ size: label, price: Number(d.price || 0) }),
        });
      } else {
        await apiFetch<BackendProductSize>("/product-sizes", {
          method: "POST",
          body: JSON.stringify({
            product_id: id,
            size: label,
            price: Number(d.price || 0),
          }),
        });
      }
    }
  },
  remove: async (id: string) => {
    await apiFetch<unknown>(`/products/${id}`, { method: "DELETE" });
  },
};

export const offersApi = {
  list: async (): Promise<Deal[]> => {
    const offers = await apiFetch<BackendOffer[]>("/offers");
    return offers
      .slice()
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map(mapOffer);
  },
  create: async (payload: {
    title: string;
    description: string;
    image: string;
    enabled: boolean;
    offerPopup: boolean;
    homepageDeal: boolean;
    discountLabel: string;
  }) => {
    await apiFetch<unknown>("/offers", {
      method: "POST",
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        image: payload.image,
        active: payload.enabled,
        offer_popup: payload.offerPopup,
        homepage_deal: payload.homepageDeal,
        discount_label: payload.discountLabel,
      }),
    });
  },
  update: async (id: string, updates: Partial<BackendOffer>) => {
    await apiFetch<unknown>(`/offers/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },
  remove: async (id: string) => {
    await apiFetch<unknown>(`/offers/${id}`, { method: "DELETE" });
  },
  enable: async (id: string) => {
    await apiFetch<unknown>(`/offers/${id}/enable`, { method: "PATCH" });
  },
  disable: async (id: string) => {
    await apiFetch<unknown>(`/offers/${id}/disable`, { method: "PATCH" });
  },
};

export const inventoryApi = {
  list: async (): Promise<InventoryItem[]> => {
    const inv = await apiFetch<BackendInventory[]>("/inventory");
    return inv
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(mapInventory);
  },
  create: async (payload: {
    name: string;
    category: string;
    unit: string;
    currentStock: number;
    minimumStock: number;
    purchasePrice: number;
    supplier: string;
  }) => {
    await apiFetch<unknown>("/inventory", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        stock: Number(payload.currentStock || 0),
        minimum_stock: Number(payload.minimumStock || 0),
        purchase_price: Number(payload.purchasePrice || 0),
        supplier: payload.supplier,
      }),
    });
  },
  update: async (
    id: string,
    payload: {
      name: string;
      category: string;
      unit: string;
      currentStock: number;
      minimumStock: number;
      purchasePrice: number;
      supplier: string;
    },
  ) => {
    await apiFetch<unknown>(`/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        stock: Number(payload.currentStock || 0),
        minimum_stock: Number(payload.minimumStock || 0),
        purchase_price: Number(payload.purchasePrice || 0),
        supplier: payload.supplier,
      }),
    });
  },
  remove: async (id: string) => {
    await apiFetch<unknown>(`/inventory/${id}`, { method: "DELETE" });
  },
};

export const inventoryTransactionsApi = {
  list: async (inventoryId?: string) => {
    const qs = inventoryId ? `?inventory_id=${encodeURIComponent(inventoryId)}` : "";
    const rows = await apiFetch<BackendInventoryTransaction[]>(
      `/inventory/transactions${qs}`,
    );
    return rows;
  },
};

export const recipesApi = {
  list: () => apiFetch<BackendRecipe[]>("/recipes"),
};

export const ordersApi = {
  list: () => apiFetch<BackendOrder[]>("/orders"),
  update: (
    id: string,
    updates: { customer_name?: string; phone?: string },
  ) =>
    apiFetch<null>(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  complete: (id: string) =>
    apiFetch<null>(`/orders/${id}/complete`, { method: "PATCH" }),
  cancel: (id: string) =>
    apiFetch<null>(`/orders/${id}/cancel`, { method: "PATCH" }),
};

