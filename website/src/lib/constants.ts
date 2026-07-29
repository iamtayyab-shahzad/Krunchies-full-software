export const SITE_NAME = "Krunchies Pizza";
export const SITE_URL = "https://krunchies.pk";
export const SITE_DESCRIPTION =
  "Order fresh pizza, burgers, deals & shakes from Krunchies Pizza. Fast delivery and takeaway across Pakistan.";

export const SITE_OG_IMAGE = "/logo.png";

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
    description: "QR or transfer using Raast / JazzCash details",
    showQr: true,
  },
  {
    id: "jazzcash" as const,
    label: "JazzCash",
    description: "QR, Till ID, or JazzCash number",
    showQr: true,
  },
  {
    id: "bank" as const,
    label: "Other Bank Payments",
    description: "Pay via IBAN / Raast from any bank",
    showQr: true,
  },
  {
    id: "cod" as const,
    label: "Cash on Delivery",
    description: "Pay when your order arrives",
    showQr: false,
  },
] as const;

/** Shared QR + manual pay details (replace when client provides theirs). */
export const PAYMENT_QR_SRC = "/payments/payment-qr.png";
export const PAYMENT_DETAILS = {
  tillId: "984012410",
  raastId: "01099132681",
  iban: "PK79JCMA2807921099132681",
  jazzcashNumber: "03267274986",
  accountName: "Tayyab Shahzad",
  jazzcashUssd: "*786*10#",
} as const;

export const CART_STORAGE_KEY = "krunchies_cart";
export const AUTH_STORAGE_KEY = "krunchies_auth";
export const AUTH_TOKEN_STORAGE_KEY = "krunchies_customer_token";
export const LAST_ORDER_KEY = "krunchies_last_order";
