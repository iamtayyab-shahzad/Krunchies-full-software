import { reviews } from "@/data/krunchies";
import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/constants";
import { delay } from "@/lib/utils";
import type {
  Category,
  CreateOrderPayload,
  Customer,
  LoginPayload,
  Location,
  Offer,
  Order,
  Product,
  ProductSize,
  RegisterPayload,
  Settings,
} from "@/types";

const MOCK_LATENCY = 250;

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

async function backendFetch<T>(
  path: string,
  options: RequestInit = {},
  withAuth = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (withAuth && typeof window !== "undefined") {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const json = (await res.json().catch(() => null)) as
    | { success: boolean; message: string; data: T }
    | null;
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json.data;
}

export async function getSettings() {
  return backendFetch<Settings>("/settings/public");
}

export async function getCategories() {
  const cats = await backendFetch<Category[]>("/categories");
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
  // Fetch from backend and join product sizes.
  const [categories, remoteProducts, remoteSizes] = await Promise.all([
    backendFetch<Category[]>("/categories"),
    backendFetch<Product[]>("/products"),
    backendFetch<ProductSize[]>("/product-sizes"),
  ]);

  let result = remoteProducts.filter((p) => p.available);

  if (params?.categoryId) {
    result = result.filter((p) => p.category_id === params.categoryId);
  }
  if (params?.featured) {
    result = result.filter((p) => p.featured);
  }
  if (params?.popular) {
    // Backend doesn't have `popular`; treat it as "featured".
    result = result.filter((p) => p.featured);
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
    const arr = sizesByProduct.get(s.product_id) || [];
    arr.push(s);
    sizesByProduct.set(s.product_id, arr);
  }

  return result
    .map((p) => ({
      ...p,
      sizes: sizesByProduct.get(p.id) || [],
      category: categories.find((c) => c.id === p.category_id),
    }))
    .sort((a, b) => a.display_order - b.display_order);
}

export async function getProductById(id: string): Promise<Product | null> {
  const [categories, product, sizes] = await Promise.all([
    backendFetch<Category[]>("/categories"),
    backendFetch<Product>(`/products/${id}`).catch(() => null),
    backendFetch<ProductSize[]>(`/product-sizes`).then((all) =>
      all.filter((s) => s.product_id === id),
    ),
  ]);
  if (!product) return null;
  return {
    ...product,
    sizes,
    category: categories.find((c) => c.id === product.category_id),
  };
}

export async function getOffers() {
  const list = await backendFetch<(Offer & { offer_popup?: boolean })[]>("/offers");
  // `offer_popup` is optional in the DB during migrations; treat missing as true.
  return list.filter((o) => o.active && (o.offer_popup === undefined || o.offer_popup));
}

export async function getLocations() {
  return backendFetch<Location[]>("/locations");
}

export async function getLocationById(id: string) {
  return backendFetch<Location>(`/locations/${id}`).catch(() => null);
}

export async function getReviews() {
  await delay(MOCK_LATENCY);
  return reviews;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return backendFetch<Order>(
    "/orders",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    true,
  );
}

export async function loginCustomer(
  payload: LoginPayload,
): Promise<Customer> {
  const result = await backendFetch<{ customer: Customer; token: string }>(
    "/auth/customers/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.token);
  return result.customer;
}

export async function registerCustomer(
  payload: RegisterPayload,
): Promise<Customer> {
  const result = await backendFetch<{ customer: Customer; token: string }>(
    "/auth/customers/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.token);
  return result.customer;
}
