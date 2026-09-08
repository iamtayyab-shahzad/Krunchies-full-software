import { pizzaCategoryIds } from "@/data/krunchies";

const PIZZA_SIZE_RE =
  /^(s|m|l|xl|small|medium|large|extra\s*large|x-?large)$/i;

const pizzaIdsLower = new Set(
  [...pizzaCategoryIds].map((id) => id.toLowerCase()),
);

export function isPizzaSizeLabel(size?: string | null): boolean {
  return PIZZA_SIZE_RE.test((size || "").trim());
}

/** S/M/L/XL only — leftover Regular rows stay in the DB for old tickets. */
export function pizzaSellableSizes<T extends { size?: string }>(
  sizes: T[] | undefined | null,
): T[] {
  return (sizes || []).filter((s) => isPizzaSizeLabel(s.size));
}

export function isPizzaCategoryName(name?: string | null): boolean {
  return (name || "").toLowerCase().includes("pizza");
}

/** Prefer persisted has_sizes; fall back to name heuristic for older clients. */
export function categoryUsesSizes(cat?: {
  name?: string | null;
  has_sizes?: boolean | null;
} | null): boolean {
  if (!cat) return false;
  if (typeof cat.has_sizes === "boolean") return cat.has_sizes;
  return isPizzaCategoryName(cat.name);
}

export function isPizzaProduct(product: {
  category_id?: string;
  category?: { id?: string; name?: string; has_sizes?: boolean } | null;
}): boolean {
  const catId = (
    product.category_id ||
    product.category?.id ||
    ""
  ).toLowerCase();
  if (catId && pizzaIdsLower.has(catId)) return true;
  if (product.category && typeof product.category.has_sizes === "boolean") {
    return product.category.has_sizes;
  }
  return isPizzaCategoryName(product.category?.name);
}
