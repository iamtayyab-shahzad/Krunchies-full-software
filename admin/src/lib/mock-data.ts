export type UserType = "admin" | "staff";

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  type: UserType;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  image: string;
  displayOrder: number;
  hidden: boolean;
};

export type PizzaSize = {
  id?: string;
  label: string;
  price: number;
};

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  image: string;
  available: boolean;
  featured: boolean;
  basePrice: number;
  pizzaSizes?: PizzaSize[];
};

export type Deal = {
  id: string;
  title: string;
  description: string;
  image: string;
  enabled: boolean;
  offerPopup: boolean;
  homepageDeal: boolean;
  discountLabel: string;
};

export type DeliveryLocation = {
  id: string;
  name: string;
  charge: number;
  active: boolean;
};

export type SiteThemeOption = "dark" | "dim" | "light" | "warm";

export type WebsiteSettings = {
  restaurantName: string;
  logo: string;
  phone: string;
  alternatePhone: string;
  whatsapp: string;
  address: string;
  openingTime: string;
  closingTime: string;
  homepageBanner: string;
  aboutSection: string;
  contactSection: string;
  footerInfo: string;
  /** First-visit theme on the customer website */
  defaultSiteTheme: SiteThemeOption;
};

export type RestaurantSettings = {
  restaurantName: string;
  logo: string;
  phone: string;
  whatsapp: string;
  openingHours: string;
  closingHours: string;
  currency: string;
  cashOnDeliveryFee: number;
  drinkFlavors: string[];
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  unitKind: string;
  purchaseUnit: string;
  unitsPerPurchase: number;
  purchasePrice: number;
  avgCostMicros: number;
  supplier: string;
  supplierId?: string;
  minimumStock: number;
  isActive: boolean;
  /** Stock value in whole Rupees (derived). */
  stockValue: number;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  contactName: string;
  notes: string;
  isActive: boolean;
};

export type PurchaseLine = {
  id?: string;
  inventoryId: string;
  inventoryName?: string;
  purchaseUnit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  quantityBase?: number;
};

export type Purchase = {
  id: string;
  invoiceNumber: string;
  supplierId?: string;
  supplierName: string;
  purchaseDate: string;
  subtotal: number;
  discount: number;
  otherCost: number;
  grandTotal: number;
  paymentMethod: string;
  amountPaid: number;
  status: string;
  notes: string;
  items: PurchaseLine[];
};

export type Expense = {
  id: string;
  category: string;
  title: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  notes: string;
  receiptImage: string;
  recurrence: string;
};

export type Recipe = {
  id: string;
  productName: string;
  ingredients: { itemName: string; quantity: number; unit: string }[];
};

export type StockHistory = {
  id: string;
  itemName: string;
  change: number;
  reason: string;
  createdAt: string;
};

export const MOCK_USERS = [
  {
    username: "admin",
    password: "admin@admin",
    user: {
      id: "u-admin",
      name: "Krunchies Admin",
      username: "admin",
      type: "admin" as const,
    },
  },
  {
    username: "staff",
    password: "staff@54321",
    user: {
      id: "u-staff",
      name: "Counter Staff",
      username: "staff",
      type: "staff" as const,
    },
  },
];

export const mockCategories: Category[] = [
  {
    id: "c1",
    name: "Shakes",
    slug: "shakes",
    image:
      "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80",
    displayOrder: 1,
    hidden: false,
  },
  {
    id: "c2",
    name: "Pasta",
    slug: "pasta",
    image:
      "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80",
    displayOrder: 2,
    hidden: false,
  },
  {
    id: "c3",
    name: "Paratha Roll",
    slug: "paratha-roll",
    image:
      "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&q=80",
    displayOrder: 3,
    hidden: false,
  },
  {
    id: "c4",
    name: "Special Burger",
    slug: "special-burger",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80",
    displayOrder: 4,
    hidden: false,
  },
  {
    id: "c5",
    name: "Regular Pizza",
    slug: "regular-pizza",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80",
    displayOrder: 5,
    hidden: false,
  },
  {
    id: "c6",
    name: "Special Pizza",
    slug: "special-pizza",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80",
    displayOrder: 6,
    hidden: false,
  },
];

export const mockProducts: Product[] = [
  {
    id: "p1",
    name: "Chocolate Shake",
    categoryId: "c1",
    description: "Rich chocolate milkshake.",
    image:
      "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80",
    available: true,
    featured: true,
    basePrice: 350,
  },
  {
    id: "p2",
    name: "Chicken Pasta",
    categoryId: "c2",
    description: "Creamy chicken pasta.",
    image:
      "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80",
    available: true,
    featured: false,
    basePrice: 550,
  },
  {
    id: "p3",
    name: "Zinger Burger",
    categoryId: "c4",
    description: "Crispy zinger with sauce.",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80",
    available: true,
    featured: true,
    basePrice: 450,
  },
  {
    id: "p4",
    name: "Chicken Tikka Pizza",
    categoryId: "c5",
    description: "Classic tikka pizza with cheese.",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80",
    available: true,
    featured: true,
    basePrice: 799,
    pizzaSizes: [
      { label: "S", price: 799 },
      { label: "M", price: 1199 },
      { label: "L", price: 1499 },
      { label: "XL", price: 1899 },
    ],
  },
  {
    id: "p5",
    name: "Malai Boti Pizza",
    categoryId: "c6",
    description: "Creamy malai boti special.",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80",
    available: false,
    featured: false,
    basePrice: 899,
    pizzaSizes: [
      { label: "S", price: 899 },
      { label: "M", price: 1299 },
      { label: "L", price: 1599 },
      { label: "XL", price: 1999 },
    ],
  },
  {
    id: "p6",
    name: "Chicken Paratha Roll",
    categoryId: "c3",
    description: "Spicy chicken paratha roll.",
    image:
      "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&q=80",
    available: true,
    featured: false,
    basePrice: 250,
  },
];

export const mockDeals: Deal[] = [
  {
    id: "d1",
    title: "Friday & Sunday 10% Off",
    description:
      "10% off on non-deal items over Rs 1,000. Friday & Sunday only (not Saturday). Ends 31 Aug 2026.",
    image:
      "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=80",
    enabled: true,
    offerPopup: true,
    homepageDeal: true,
    discountLabel: "10% OFF",
  },
  {
    id: "d2",
    title: "Family Pizza Combo",
    description: "2 Large pizzas + fries + drinks.",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
    enabled: true,
    offerPopup: false,
    homepageDeal: true,
    discountLabel: "COMBO",
  },
  {
    id: "d3",
    title: "Student Special",
    description: "Burger + fries at special price.",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
    enabled: false,
    offerPopup: false,
    homepageDeal: false,
    discountLabel: "SAVE",
  },
];

export const mockDeliveryLocations: DeliveryLocation[] = [
  { id: "dl1", name: "City Center", charge: 0, active: true },
  { id: "dl2", name: "Cantt Area", charge: 100, active: true },
  { id: "dl3", name: "Satellite Town", charge: 150, active: true },
  { id: "dl4", name: "Outskirts", charge: 250, active: false },
];

export const mockWebsiteSettings: WebsiteSettings = {
  restaurantName: "Krunchies Pizza",
  logo: "/logo.png",
  phone: "03002022633",
  alternatePhone: "0301-6355076",
  whatsapp: "923002022633",
  address: "Main Boulevard, Your City",
  openingTime: "10:50 AM",
  closingTime: "11:00 PM",
  homepageBanner:
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&q=80",
  aboutSection:
    "Krunchies Pizza brings bold flavors and crunchy happiness to every bite.",
  contactSection: "Call us or WhatsApp for orders and catering.",
  footerInfo: "THANK YOU FOR CHOOSING KRUNCHI PIZZA!",
  defaultSiteTheme: "dark",
};

export const mockRestaurantSettings: RestaurantSettings = {
  restaurantName: "Krunchies Pizza",
  logo: "/logo.png",
  phone: "03002022633",
  whatsapp: "923002022633",
  openingHours: "10:50 AM",
  closingHours: "11:00 PM",
  currency: "Rs",
  cashOnDeliveryFee: 50,
  drinkFlavors: ["Coke", "Sprite", "Fanta"],
};

export const mockInventory: InventoryItem[] = [];

export const mockRecipes: Recipe[] = [];

export const mockStockHistory: StockHistory[] = [];

export const mockAnalytics = {
  todaySales: 5848,
  weeklySales: 41200,
  monthlySales: 168500,
  bestSelling: [
    { name: "Chicken Tikka Pizza", sold: 86 },
    { name: "Zinger Burger", sold: 74 },
    { name: "Chocolate Shake", sold: 61 },
    { name: "Chicken Pasta", sold: 48 },
  ],
  paymentBreakdown: [
    { method: "COD", amount: 98000 },
    { method: "Cash", amount: 42000 },
    { method: "Card", amount: 28500 },
  ],
};
