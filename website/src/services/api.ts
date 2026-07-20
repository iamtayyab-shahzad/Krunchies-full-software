import {
  locations,
  reviews,
  settings,
} from "@/data/krunchies";
import { delay } from "@/lib/utils";
import type {
  CreateOrderPayload,
  Customer,
  LoginPayload,
  Order,
  Product,
  ProductSize,
  RegisterPayload,
} from "@/types";

const MOCK_LATENCY = 250;

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

async function backendFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  const json = (await res.json().catch(() => null)) as
    | { success: boolean; message: string; data: T }
    | null;
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json.data;
}

export async function getSettings() {
  await delay(MOCK_LATENCY);
  return settings;
}

export async function getCategories() {
  await delay(MOCK_LATENCY);
  const cats = await backendFetch<any[]>("/categories");
  return cats
    .filter((c) => c.visible)
    .sort((a, b) => a.display_order - b.display_order);
}

export async function getProducts(params?: {
  categoryId?: string;
  search?: string;
  featured?: boolean;
  popular?: boolean;
}): Promise<Product[]> {
  await delay(MOCK_LATENCY);
  // Fetch from backend and join product sizes.
  const [categories, remoteProducts, remoteSizes] = await Promise.all([
    backendFetch<any[]>("/categories"),
    backendFetch<any[]>("/products"),
    backendFetch<ProductSize[]>("/product-sizes"),
  ]);

  let result = remoteProducts.filter((p: any) => p.available);

  if (params?.categoryId) {
    result = result.filter((p: any) => p.category_id === params.categoryId);
  }
  if (params?.featured) {
    result = result.filter((p) => p.featured);
  }
  if (params?.popular) {
    // Backend doesn't have `popular`; treat it as "featured".
    result = result.filter((p: any) => p.featured);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }

  const sizesByProduct = new Map<string, ProductSize[]>();
  for (const s of remoteSizes) {
    const arr = sizesByProduct.get((s as any).product_id) || [];
    arr.push(s);
    sizesByProduct.set((s as any).product_id, arr);
  }

  return result
    .map((p: any) => ({
      ...p,
      sizes: sizesByProduct.get(p.id) || [],
      category: categories.find((c: any) => c.id === p.category_id),
    }))
    .sort((a, b) => (a as any).display_order - (b as any).display_order);
}

export async function getProductById(id: string): Promise<Product | null> {
  await delay(MOCK_LATENCY);
  const [categories, product, sizes] = await Promise.all([
    backendFetch<any[]>("/categories"),
    backendFetch<any>(`/products/${id}`).catch(() => null),
    backendFetch<ProductSize[]>(`/product-sizes`).then((all) =>
      all.filter((s) => (s as any).product_id === id),
    ),
  ]);
  if (!product) return null;
  return {
    ...product,
    sizes,
    category: categories.find((c) => c.id === (product as any).category_id),
  };
}

export async function getOffers() {
  await delay(MOCK_LATENCY);
  const list = await backendFetch<any[]>("/offers");
  // `offer_popup` is optional in the DB during migrations; treat missing as true.
  return list.filter((o) => o.active && (o.offer_popup === undefined || o.offer_popup));
}

export async function getLocations() {
  await delay(MOCK_LATENCY);
  return locations;
}

export async function getLocationById(id: string) {
  await delay(MOCK_LATENCY);
  return locations.find((l) => l.id === id) ?? null;
}

export async function getReviews() {
  await delay(MOCK_LATENCY);
  return reviews;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  await delay(500);
  const order: Order = {
    id: `ord-${Date.now()}`,
    order_number: `KR-${Math.floor(100000 + Math.random() * 900000)}`,
    customer_name: payload.customer_name,
    phone: payload.phone,
    address: payload.address,
    location_id: payload.location_id,
    delivery_charge: payload.delivery_charge,
    payment_method: payload.payment_method,
    order_status: "pending",
    order_notes: payload.order_notes,
    subtotal: payload.subtotal,
    grand_total: payload.grand_total,
    cash_on_delivery_fee: payload.cash_on_delivery_fee,
    items: payload.items,
    created_at: new Date().toISOString(),
  };
  return order;
}

export async function loginCustomer(
  payload: LoginPayload,
): Promise<Customer> {
  await delay(400);
  if (!payload.phone || !payload.password) {
    throw new Error("Phone and password are required");
  }
  if (payload.password.length < 4) {
    throw new Error("Invalid credentials");
  }
  return {
    id: "cust-demo",
    name: "Demo Customer",
    phone: payload.phone,
  };
}

export async function registerCustomer(
  payload: RegisterPayload,
): Promise<Customer> {
  await delay(400);
  if (!payload.name || !payload.phone || !payload.password) {
    throw new Error("All fields are required");
  }
  return {
    id: `cust-${Date.now()}`,
    name: payload.name,
    phone: payload.phone,
  };
}
