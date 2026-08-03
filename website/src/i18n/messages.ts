export type Locale = "en" | "ur";

export const LOCALE_STORAGE_KEY = "krunchies_locale";

export type MessageKey = keyof typeof en;

const en = {
  nav_home: "Home",
  nav_menu: "Menu",
  nav_about: "About",
  nav_contact: "Contact",
  nav_login: "Login",
  nav_logout: "Logout",
  nav_cart: "Cart",
  nav_order_online: "Order Online",
  lang_en: "EN",
  lang_ur: "اردو",
  lang_switch: "Language",

  menu_title: "Menu",
  menu_subtitle:
    "Official Krunchies Pizza menu — shakes, pasta, rolls, burgers, pizzas, and family deals.",
  menu_categories: "Categories",
  menu_all_items: "All Items",
  menu_search: "Search menu...",
  menu_filter_all: "All",
  menu_filter_pizzas: "Pizzas",
  menu_filter_other: "Other",
  menu_empty: "No products found.",
  menu_unavailable: "Menu is temporarily unavailable.",
  menu_retry: "Retry",
  menu_from: "From",
  menu_add: "Add",
  menu_view: "View",

  footer_explore: "Explore",
  footer_contact: "Contact",
  footer_hours: "Open daily",
  footer_follow: "Follow us",

  cart_title: "Your Cart",
  cart_empty: "Your cart is empty",
  cart_checkout: "Checkout",
  cart_total: "Total",
  cart_view: "View cart",

  common_loading: "Loading...",
  common_close: "Close",
  common_save: "Save",
  common_cancel: "Cancel",
  common_continue: "Continue",
} as const;

const ur: Record<MessageKey, string> = {
  nav_home: "ہوم",
  nav_menu: "مینو",
  nav_about: "ہمارے بارے میں",
  nav_contact: "رابطہ",
  nav_login: "لاگ اِن",
  nav_logout: "لاگ آؤٹ",
  nav_cart: "کارٹ",
  nav_order_online: "آن لائن آرڈر",
  lang_en: "EN",
  lang_ur: "اردو",
  lang_switch: "زبان",

  menu_title: "مینو",
  menu_subtitle:
    "کرنچیز پیزا کا سرکاری مینو — شیکس، پاستا، رولز، برگرز، پیزاز اور فیملی ڈیلز۔",
  menu_categories: "کیٹگریز",
  menu_all_items: "تمام آئٹمز",
  menu_search: "مینو تلاش کریں...",
  menu_filter_all: "سب",
  menu_filter_pizzas: "پیزاز",
  menu_filter_other: "دیگر",
  menu_empty: "کوئی پروڈکٹ نہیں ملا۔",
  menu_unavailable: "مینو عارضی طور پر دستیاب نہیں۔",
  menu_retry: "دوبارہ کوشش",
  menu_from: "سے",
  menu_add: "شامل کریں",
  menu_view: "دیکھیں",

  footer_explore: "دریافت کریں",
  footer_contact: "رابطہ",
  footer_hours: "روزانہ کھلا",
  footer_follow: "ہمیں فالو کریں",

  cart_title: "آپ کی کارٹ",
  cart_empty: "آپ کی کارٹ خالی ہے",
  cart_checkout: "چیک آؤٹ",
  cart_total: "کل",
  cart_view: "کارٹ دیکھیں",

  common_loading: "لوڈ ہو رہا ہے...",
  common_close: "بند کریں",
  common_save: "محفوظ کریں",
  common_cancel: "منسوخ",
  common_continue: "جاری رکھیں",
};

export const messages = { en, ur } as const;

/** Category display names in Urdu (matched by English catalog name). */
export const categoryNameUrdu: Record<string, string> = {
  "Pizza (Regular Flavour)": "پیزا (ریگولر فلیور)",
  "Krunchies Special Pizza": "کرنچیز اسپیشل پیزا",
  "Special Pizza": "اسپیشل پیزا",
  Burger: "برگر",
  "Special Burger": "اسپیشل برگر",
  Sandwich: "سینڈوچ",
  "Paratha Roll": "پراٹھا رول",
  "Fried Chicken": "فرائیڈ چکن",
  Pasta: "پاستا",
  Fries: "فرائز",
  Shakes: "شیکس",
  "Cold Drinks": "کولڈ ڈرنکس",
  Deals: "ڈیلز",
};

export function translateCategoryName(name: string, locale: Locale): string {
  if (locale !== "ur") return name;
  return categoryNameUrdu[name] || name;
}
