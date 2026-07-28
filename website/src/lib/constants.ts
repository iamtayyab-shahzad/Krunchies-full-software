export const SITE_NAME = "Krunchies Pizza";
export const SITE_URL = "https://krunchies.pizza";
export const SITE_DESCRIPTION =
  "Premium handcrafted pizzas, bold flavors, and fast delivery. Order from Krunchies Pizza today.";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const PAYMENT_METHODS = [
  {
    id: "easypaisa" as const,
    label: "EasyPaisa",
    description: "Scan QR and pay with EasyPaisa",
    showQr: true,
  },
  {
    id: "jazzcash" as const,
    label: "JazzCash",
    description: "Scan QR and pay with JazzCash",
    showQr: true,
  },
  {
    id: "bank" as const,
    label: "Other Bank Payments",
    description: "Scan QR and pay from any bank app",
    showQr: true,
  },
  {
    id: "cod" as const,
    label: "Cash on Delivery",
    description: "Pay when your order arrives",
    showQr: false,
  },
] as const;

/** Shared QR for EasyPaisa / JazzCash / bank transfer (replace file when client provides theirs). */
export const PAYMENT_QR_SRC = "/payments/payment-qr.png";
export const PAYMENT_TILL_ID = "984012410";

export const CART_STORAGE_KEY = "krunchies_cart";
export const AUTH_STORAGE_KEY = "krunchies_auth";
export const AUTH_TOKEN_STORAGE_KEY = "krunchies_customer_token";
export const LAST_ORDER_KEY = "krunchies_last_order";
