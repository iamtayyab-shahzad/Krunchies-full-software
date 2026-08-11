import { pizzaCategoryIds } from "@/data/krunchies";

const PIZZA_SIZE_RE =
  /^(s|m|l|xl|small|medium|large|extra\s*large|x-?large)$/i;

const pizzaIdsLower = new Set(
  [...pizzaCategoryIds].map((id) => id.toLowerCase()),
);

export function isPizzaSizeLabel(size?: string | null): boolean {
  return PIZZA_SIZE_RE.test((size || "").trim());
}

export function isPizzaCategoryName(name?: string | null): boolean {
  return (name || "").toLowerCase().includes("pizza");
}

export function isPizzaProduct(product: {
  category_id?: string;
  category?: { id?: string; name?: string } | null;
}): boolean {
  const catId = (
    product.category_id ||
    product.category?.id ||
    ""
  ).toLowerCase();
  if (catId && pizzaIdsLower.has(catId)) return true;
  return isPizzaCategoryName(product.category?.name);
}
