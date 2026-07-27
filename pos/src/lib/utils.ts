import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BillLine, OrderType, PaymentMethod } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency = "Rs") {
  return `${currency} ${Number(amount || 0).toLocaleString("en-PK")}`;
}

/** True when JWT is missing, malformed, or past its exp claim. */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const parts = token.split(".");
  if (parts.length !== 3) return true;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (typeof payload.exp !== "number") return true;
    return Math.floor(Date.now() / 1000) >= payload.exp - 10;
  } catch {
    return true;
  }
}

/** How long a previously-logged-in cashier may keep using POS offline after JWT exp. */
export const OFFLINE_SESSION_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

/** True when IndexedDB session can unlock POS without a fresh internet login. */
export function isOfflineSessionValid(session: {
  token?: string;
  exp?: number | null;
  saved_at?: string;
} | null): boolean {
  if (!session?.token) return false;
  if (!session.exp || session.exp * 1000 > Date.now()) return true;
  if (!session.saved_at) return false;
  const saved = new Date(session.saved_at).getTime();
  if (Number.isNaN(saved)) return false;
  return Date.now() - saved < OFFLINE_SESSION_GRACE_MS;
}

/** Deterministic walk-in location seeded by importmenu. */
export const WALKIN_LOCATION_ID = "50000000-0000-4000-8000-000000000000";

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-PK", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function calcSubtotal(items: BillLine[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function calcCodFee(
  method: PaymentMethod,
  fee: number,
) {
  return method === "cod" ? fee : 0;
}

export function calcGrandTotal(
  subtotal: number,
  deliveryCharge: number,
  codFee: number,
) {
  return subtotal + deliveryCharge + codFee;
}

export function makeLineKey(
  productId: string,
  sizeId: string,
  instructions?: string,
) {
  const note = (instructions || "").trim();
  return note
    ? `${productId}__${sizeId}__${note}`
    : `${productId}__${sizeId}`;
}

export const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
}[] = [
  { id: "cash", label: "Cash" },
  { id: "easypaisa", label: "EasyPaisa" },
  { id: "jazzcash", label: "JazzCash" },
  { id: "card", label: "Card" },
  { id: "cod", label: "Cash On Delivery" },
];

/** Walk-in: counter payments only. Phone/website: no in-store cash. */
export function paymentsForOrderType(orderType: OrderType) {
  if (orderType === "walkin") {
    return PAYMENT_METHODS.filter(
      (m) => m.id === "cash" || m.id === "easypaisa" || m.id === "jazzcash",
    );
  }
  return PAYMENT_METHODS.filter((m) => m.id !== "cash");
}

export function defaultPaymentForOrderType(orderType: OrderType): PaymentMethod {
  return paymentsForOrderType(orderType)[0]?.id ?? "cash";
}

/** POS staff create walk-in / phone only; website orders arrive from the website. */
export const ORDER_TYPES = [
  { id: "walkin" as const, label: "Walk-in" },
  { id: "phone" as const, label: "Phone Order" },
];

export const TOKEN_KEY = "krunchies_pos_token";
export const LAST_RECEIPT_KEY = "krunchies_pos_last_receipt";

// ---------------------------------------------------------------------------
// Pakistani mobile number helpers
//
// Valid format: 11 digits starting with "03" (e.g. 0300-1234567).
// We also accept common input variants and normalise them to 03XXXXXXXXX:
//   +923001234567 / 923001234567 / 3001234567 -> 03001234567
// ---------------------------------------------------------------------------

/** Strip everything except digits, converting +92/92 prefixes to a leading 0. */
export function normalizePkPhone(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("92")) {
    digits = "0" + digits.slice(2);
  } else if (digits.length === 10 && digits.startsWith("3")) {
    // 3001234567 -> 03001234567
    digits = "0" + digits;
  }
  return digits.slice(0, 11);
}

/** A valid PK mobile is exactly 11 digits and begins with 03. */
export function isValidPkPhone(raw: string): boolean {
  return /^03\d{9}$/.test(normalizePkPhone(raw));
}

/**
 * Format for display/input as the user types: 03XX-XXXXXXX.
 * Keeps partial input usable (no dash until we have more than 4 digits).
 */
export function formatPkPhone(raw: string): string {
  const digits = normalizePkPhone(raw);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}
