import type {
  Category,
  Location,
  Offer,
  Product,
  Review,
  Settings,
} from "@/types";

export const settings: Settings = {
  restaurant_name: "Krunchies Pizza",
  phone: "+92 300 1234567",
  whatsapp: "923001234567",
  logo: "/logo.svg",
  opening_time: "11:00 AM",
  closing_time: "11:00 PM",
  cash_on_delivery_fee: 50,
  currency: "Rs",
  google_maps: "https://maps.google.com",
  facebook: "https://facebook.com/krunchiespizza",
  instagram: "https://instagram.com/krunchiespizza",
  address: "Shop 12, Food Street, Lahore, Pakistan",
  email: "hello@krunchies.pizza",
};

export const categories: Category[] = [
  {
    id: "cat-pizza",
    name: "Pizzas",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
    display_order: 1,
    visible: true,
  },
  {
    id: "cat-sides",
    name: "Sides",
    image:
      "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80",
    display_order: 2,
    visible: true,
  },
  {
    id: "cat-pasta",
    name: "Pasta",
    image:
      "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80",
    display_order: 3,
    visible: true,
  },
  {
    id: "cat-drinks",
    name: "Drinks",
    image:
      "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800&q=80",
    display_order: 4,
    visible: true,
  },
  {
    id: "cat-desserts",
    name: "Desserts",
    image:
      "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80",
    display_order: 5,
    visible: true,
  },
];

export const products: Product[] = [
  {
    id: "prod-1",
    category_id: "cat-pizza",
    name: "Margherita Classic",
    description:
      "San Marzano tomato sauce, fresh mozzarella, basil, and extra virgin olive oil on our signature dough.",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d264?w=900&q=80",
    featured: true,
    available: true,
    display_order: 1,
    popular: true,
    sizes: [
      { id: "s1-sm", product_id: "prod-1", size: "Small", price: 799 },
      { id: "s1-md", product_id: "prod-1", size: "Medium", price: 1199 },
      { id: "s1-lg", product_id: "prod-1", size: "Large", price: 1599 },
    ],
  },
  {
    id: "prod-2",
    category_id: "cat-pizza",
    name: "Pepperoni Inferno",
    description:
      "Loaded with spicy pepperoni, mozzarella, chili flakes, and our house-made tomato sauce.",
    image:
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=900&q=80",
    featured: true,
    available: true,
    display_order: 2,
    popular: true,
    sizes: [
      { id: "s2-sm", product_id: "prod-2", size: "Small", price: 999 },
      { id: "s2-md", product_id: "prod-2", size: "Medium", price: 1499 },
      { id: "s2-lg", product_id: "prod-2", size: "Large", price: 1899 },
    ],
  },
  {
    id: "prod-3",
    category_id: "cat-pizza",
    name: "BBQ Chicken Supreme",
    description:
      "Smoky BBQ sauce, grilled chicken, red onions, cilantro, and melted cheese blend.",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=80",
    featured: true,
    available: true,
    display_order: 3,
    popular: true,
    sizes: [
      { id: "s3-sm", product_id: "prod-3", size: "Small", price: 1099 },
      { id: "s3-md", product_id: "prod-3", size: "Medium", price: 1599 },
      { id: "s3-lg", product_id: "prod-3", size: "Large", price: 1999 },
    ],
  },
  {
    id: "prod-4",
    category_id: "cat-pizza",
    name: "Four Cheese Delight",
    description:
      "Mozzarella, cheddar, parmesan, and gorgonzola on a creamy garlic base.",
    image:
      "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=900&q=80",
    featured: false,
    available: true,
    display_order: 4,
    sizes: [
      { id: "s4-sm", product_id: "prod-4", size: "Small", price: 949 },
      { id: "s4-md", product_id: "prod-4", size: "Medium", price: 1399 },
      { id: "s4-lg", product_id: "prod-4", size: "Large", price: 1799 },
    ],
  },
  {
    id: "prod-5",
    category_id: "cat-pizza",
    name: "Veggie Garden",
    description:
      "Bell peppers, mushrooms, olives, onions, tomatoes, and corn on mozzarella.",
    image:
      "https://images.unsplash.com/photo-1604917877934-07dabd5264c5?w=900&q=80",
    featured: false,
    available: true,
    display_order: 5,
    sizes: [
      { id: "s5-sm", product_id: "prod-5", size: "Small", price: 849 },
      { id: "s5-md", product_id: "prod-5", size: "Medium", price: 1299 },
      { id: "s5-lg", product_id: "prod-5", size: "Large", price: 1699 },
    ],
  },
  {
    id: "prod-6",
    category_id: "cat-pizza",
    name: "Meat Feast",
    description:
      "Pepperoni, sausage, beef, chicken, and bacon with extra mozzarella.",
    image:
      "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=900&q=80",
    featured: true,
    available: true,
    display_order: 6,
    popular: true,
    sizes: [
      { id: "s6-sm", product_id: "prod-6", size: "Small", price: 1199 },
      { id: "s6-md", product_id: "prod-6", size: "Medium", price: 1699 },
      { id: "s6-lg", product_id: "prod-6", size: "Large", price: 2199 },
    ],
  },
  {
    id: "prod-7",
    category_id: "cat-sides",
    name: "Garlic Breadsticks",
    description:
      "Crispy breadsticks brushed with garlic butter and finished with herbs.",
    image:
      "https://images.unsplash.com/photo-1573140401552-3fab57c49008?w=900&q=80",
    featured: false,
    available: true,
    display_order: 1,
    sizes: [
      { id: "s7-reg", product_id: "prod-7", size: "Regular", price: 349 },
      { id: "s7-lg", product_id: "prod-7", size: "Large", price: 499 },
    ],
  },
  {
    id: "prod-8",
    category_id: "cat-sides",
    name: "Loaded Fries",
    description:
      "Crispy fries topped with cheese sauce, jalapeños, and herbs.",
    image:
      "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&q=80",
    featured: true,
    available: true,
    display_order: 2,
    popular: true,
    sizes: [
      { id: "s8-reg", product_id: "prod-8", size: "Regular", price: 399 },
      { id: "s8-lg", product_id: "prod-8", size: "Large", price: 549 },
    ],
  },
  {
    id: "prod-9",
    category_id: "cat-pasta",
    name: "Creamy Alfredo Pasta",
    description:
      "Fettuccine in rich Alfredo sauce with grilled chicken and parmesan.",
    image:
      "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=900&q=80",
    featured: false,
    available: true,
    display_order: 1,
    sizes: [
      { id: "s9-reg", product_id: "prod-9", size: "Regular", price: 799 },
      { id: "s9-lg", product_id: "prod-9", size: "Large", price: 999 },
    ],
  },
  {
    id: "prod-10",
    category_id: "cat-pasta",
    name: "Spicy Arrabbiata",
    description:
      "Penne pasta in spicy tomato sauce with garlic and chili flakes.",
    image:
      "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=900&q=80",
    featured: false,
    available: true,
    display_order: 2,
    sizes: [
      { id: "s10-reg", product_id: "prod-10", size: "Regular", price: 699 },
      { id: "s10-lg", product_id: "prod-10", size: "Large", price: 899 },
    ],
  },
  {
    id: "prod-11",
    category_id: "cat-drinks",
    name: "Chilled Soft Drink",
    description: "Ice-cold soft drink of your choice.",
    image:
      "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=900&q=80",
    featured: false,
    available: true,
    display_order: 1,
    sizes: [
      { id: "s11-reg", product_id: "prod-11", size: "Regular", price: 120 },
      { id: "s11-lg", product_id: "prod-11", size: "Large", price: 180 },
    ],
  },
  {
    id: "prod-12",
    category_id: "cat-desserts",
    name: "Chocolate Lava Cake",
    description:
      "Warm chocolate cake with a molten center, served with vanilla ice cream.",
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&q=80",
    featured: true,
    available: true,
    display_order: 1,
    sizes: [
      { id: "s12-reg", product_id: "prod-12", size: "Regular", price: 449 },
    ],
  },
];

export const offers: Offer[] = [
  {
    id: "offer-1",
    title: "Buy 1 Get 1 Free",
    description:
      "Order any large pizza and get a medium Margherita free. Limited time only!",
    image:
      "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=900&q=80",
    active: true,
  },
];

export const locations: Location[] = [
  { id: "loc-1", name: "Gulberg", delivery_charge: 150 },
  { id: "loc-2", name: "DHA Phase 5", delivery_charge: 200 },
  { id: "loc-3", name: "Johar Town", delivery_charge: 180 },
  { id: "loc-4", name: "Model Town", delivery_charge: 160 },
  { id: "loc-5", name: "Bahria Town", delivery_charge: 250 },
  { id: "loc-6", name: "Cantt", delivery_charge: 170 },
];

export const reviews: Review[] = [
  {
    id: "rev-1",
    name: "Ayesha Khan",
    rating: 5,
    comment:
      "Best pizza in the city. The crust is perfect and delivery is always on time.",
  },
  {
    id: "rev-2",
    name: "Hassan Ali",
    rating: 5,
    comment:
      "Pepperoni Inferno is unreal. Ordered three times this week already.",
  },
  {
    id: "rev-3",
    name: "Sara Ahmed",
    rating: 4,
    comment:
      "Great flavors and premium feel. The BBQ Chicken Supreme is my go-to.",
  },
];
