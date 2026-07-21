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
    description: "Pay via EasyPaisa mobile wallet",
  },
  {
    id: "jazzcash" as const,
    label: "JazzCash",
    description: "Pay via JazzCash mobile wallet",
  },
  {
    id: "card" as const,
    label: "Card",
    description: "Credit or debit card",
  },
  {
    id: "cod" as const,
    label: "Cash on Delivery",
    description: "Pay when your order arrives",
  },
];

export const CART_STORAGE_KEY = "krunchies_cart";
export const AUTH_STORAGE_KEY = "krunchies_auth";
export const AUTH_TOKEN_STORAGE_KEY = "krunchies_customer_token";
export const LAST_ORDER_KEY = "krunchies_last_order";
