import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency = "Rs") {
  return `${currency} ${Number(amount || 0).toLocaleString("en-PK")}`;
}

export const AUTH_KEY = "krunchies_admin_auth";
export const TOKEN_KEY = "krunchies_admin_token";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
export const POS_URL =
  process.env.NEXT_PUBLIC_POS_URL || "http://localhost:3001";
