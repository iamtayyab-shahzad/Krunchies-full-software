import type { Metadata } from "next";
import MenuClient from "./menu-client";
import { pageSeo } from "@/lib/seo";
import { getCategories, getProducts } from "@/services/api";
import type { Category, Product } from "@/types";

export const metadata: Metadata = pageSeo({
  title: "Krunchies Pizza Menu | Pizza, Burgers, Deals & Shakes",
  description:
    "Browse the full Krunchies Pizza menu — pizzas, burgers, rolls, pasta, fries, shakes, and family deals.",
  path: "/menu",
  absoluteTitle: true,
});

/** Revalidate catalog periodically so menu stays fresh without a cold client fetch. */
export const revalidate = 60;

async function loadMenuCatalog(): Promise<{
  categories: Category[];
  products: Product[];
}> {
  try {
    const [categories, products] = await Promise.all([
      getCategories(),
      getProducts(),
    ]);
    return { categories, products };
  } catch {
    return { categories: [], products: [] };
  }
}

export default async function MenuPage() {
  const { categories, products } = await loadMenuCatalog();

  // No Suspense around MenuClient — it must SSR with initialProducts so
  // view-source/curl show real product names (not a "Loading menu..." hole).
  // Category query (?category=) is applied after mount in the client.
  return (
    <MenuClient
      initialCategories={categories}
      initialProducts={products}
    />
  );
}
