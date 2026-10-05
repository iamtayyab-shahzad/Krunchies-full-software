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

/**
 * Placeholder labels used for single-size products. These are hidden on
 * tiles, bill lines and receipts; any other label (Full, Half, Small, 500ml…)
 * is meaningful and must be shown so staff/kitchen can tell lines apart.
 */
const GENERIC_SIZE_RE =
  /^(regular|standard|default|normal|deal|single|one\s*size|-)$/i;

export function isDisplayableSizeLabel(size?: string | null): boolean {
  const s = (size || "").trim();
  return s.length > 0 && !GENERIC_SIZE_RE.test(s);
}

/**
 * Sizes a product can be sold in on the POS.
 * Pizza products only expose S/M/L/XL; every other product exposes all its
 * configured sizes (e.g. Full / Small), matching the website behaviour.
 */
export function sellableSizes<T extends { size?: string }>(
  product: Parameters<typeof isPizzaProduct>[0] & {
    sizes?: T[] | null;
  },
): T[] {
  return isPizzaProduct(product)
    ? pizzaSellableSizes(product.sizes)
    : product.sizes || [];
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
