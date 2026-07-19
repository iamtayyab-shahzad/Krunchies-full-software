import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BillLine, PaymentMethod } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency = "Rs") {
  return `${currency} ${Number(amount || 0).toLocaleString("en-PK")}`;
}

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

export function makeLineKey(productId: string, sizeId: string) {
  return `${productId}__${sizeId}`;
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

export const ORDER_TYPES = [
  { id: "walkin" as const, label: "Walk-in" },
  { id: "phone" as const, label: "Phone Order" },
  { id: "website" as const, label: "Website Order" },
];

export const TOKEN_KEY = "krunchies_pos_token";
export const LAST_RECEIPT_KEY = "krunchies_pos_last_receipt";
