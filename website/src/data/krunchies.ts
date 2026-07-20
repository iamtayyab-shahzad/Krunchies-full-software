import catalog from "../../../shared/krunchies-menu.json";
import type {
  Category,
  Location,
  Offer,
  Product,
  Review,
  Settings,
} from "@/types";

const categoryBySlug = new Map(
  catalog.categories.map((category) => [category.slug, category]),
);

export const pizzaCategoryIds = new Set(
  catalog.categories
    .filter((category) => category.slug.includes("pizza"))
    .map((category) => category.id),
);

function sizeId(productId: string, index: number) {
  const serial = Number(productId.slice(-12));
  return `30000000-0000-4000-8000-${String(serial * 10 + index + 1).padStart(12, "0")}`;
}

const phoneLine = [catalog.restaurant.phone, catalog.restaurant.alternatePhone]
  .filter(Boolean)
  .join(" · ");

export const restaurant = catalog.restaurant;

export const settings: Settings = {
  restaurant_name: catalog.restaurant.name,
  phone: catalog.restaurant.phone,
  whatsapp: catalog.restaurant.whatsapp,
  logo: "/logo.svg",
  opening_time: catalog.restaurant.openingTime,
  closing_time: catalog.restaurant.closingTime,
  cash_on_delivery_fee: 50,
  currency: catalog.restaurant.currency,
  google_maps: "",
  facebook: "",
  instagram: "",
  address: catalog.restaurant.deliveryNote || catalog.restaurant.name,
  email: "",
};

export const categories: Category[] = catalog.categories.map((category) => ({
  id: category.id,
  name: category.name,
  image: category.image,
  display_order: category.displayOrder,
  visible: true,
}));

export const products: Product[] = catalog.products.map((product, index) => {
  const category = categoryBySlug.get(product.category);
  if (!category) {
    throw new Error(`Missing category for ${product.name}`);
  }
  return {
    id: product.id,
    category_id: category.id,
    name: product.name,
    description: product.description,
    image: product.image,
    featured: product.featured,
    available: true,
    display_order: index + 1,
    popular: product.featured,
    sizes: product.sizes.map((size, sizeIndex) => ({
      id: sizeId(product.id, sizeIndex),
      product_id: product.id,
      size: size.name,
      price: size.price,
    })),
  };
});

export const offers: Offer[] = [
  ...catalog.promotions.map((promo) => ({
    id: promo.id,
    title: promo.title,
    description: promo.description,
    image: promo.image,
    active: promo.active,
    start_date: promo.startDate,
    end_date: promo.endDate,
  })),
  ...catalog.products
    .filter((product) => product.category === "deals")
    .map((deal, index) => ({
      id: `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      title: `${deal.name} — ${catalog.restaurant.currency} ${deal.sizes[0].price.toLocaleString("en-PK")}`,
      description: deal.description,
      image: deal.image,
      active: true,
    })),
];

// The printed menu confirms delivery but does not publish a street address.
export const locations: Location[] = [
  {
    id: "50000000-0000-4000-8000-000000000001",
    name: "Local Delivery Area",
    delivery_charge: 0,
  },
];

export const reviews: Review[] = [
  {
    id: "review-1",
    name: "Krunchies Customer",
    rating: 5,
    comment: "Fresh food, generous portions, and great value.",
  },
  {
    id: "review-2",
    name: "Local Customer",
    rating: 5,
    comment: "The Krunchies Special pizza and Zinger Tower Burger are favorites.",
  },
  {
    id: "review-3",
    name: "Pizza Lover",
    rating: 5,
    comment: `Call ${phoneLine} for free delivery between ${catalog.restaurant.openingTime} and ${catalog.restaurant.closingTime}.`,
  },
];
