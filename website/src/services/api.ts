import {
  categories,
  locations,
  offers,
  products,
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
  RegisterPayload,
} from "@/types";

const MOCK_LATENCY = 250;

export async function getSettings() {
  await delay(MOCK_LATENCY);
  return settings;
}

export async function getCategories() {
  await delay(MOCK_LATENCY);
  return categories
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
  let result = products.filter((p) => p.available);

  if (params?.categoryId) {
    result = result.filter((p) => p.category_id === params.categoryId);
  }
  if (params?.featured) {
    result = result.filter((p) => p.featured);
  }
  if (params?.popular) {
    result = result.filter((p) => p.popular);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }

  return result
    .map((p) => ({
      ...p,
      category: categories.find((c) => c.id === p.category_id),
    }))
    .sort((a, b) => a.display_order - b.display_order);
}

export async function getProductById(id: string): Promise<Product | null> {
  await delay(MOCK_LATENCY);
  const product = products.find((p) => p.id === id);
  if (!product) return null;
  return {
    ...product,
    category: categories.find((c) => c.id === product.category_id),
  };
}

export async function getOffers() {
  await delay(MOCK_LATENCY);
  return offers.filter((o) => o.active);
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
