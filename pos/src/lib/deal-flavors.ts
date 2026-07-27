import type { Product } from "@/types";

export type PizzaSizeCode = "S" | "M" | "L" | "XL";
export type PizzaTier = "regular" | "special";

export type DealPizzaSlot = {
  id: string;
  label: string;
  size: PizzaSizeCode;
  tier: PizzaTier;
};

const SIZE_ALIASES: Record<string, PizzaSizeCode> = {
  small: "S",
  s: "S",
  medium: "M",
  m: "M",
  large: "L",
  l: "L",
  xl: "XL",
  "extra large": "XL",
};

/** Parse deal description into pizza flavor slots matching size + regular/special. */
export function parseDealPizzaSlots(description: string): DealPizzaSlot[] {
  const slots: DealPizzaSlot[] = [];
  const re =
    /(\d+)\s*(small|medium|large|xl|extra\s*large|s|m|l)\s+pizzas?(?:\s+(special))?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(description)) !== null) {
    const count = Math.min(8, Math.max(1, Number(match[1]) || 1));
    const sizeToken = match[2].toLowerCase().replace(/\s+/g, " ").trim();
    const size = SIZE_ALIASES[sizeToken] || "L";
    const tier: PizzaTier = match[3] ? "special" : "regular";
    for (let i = 0; i < count; i += 1) {
      const n = slots.length + 1;
      const tierLabel = tier === "special" ? "Special" : "Regular";
      slots.push({
        id: `pizza-${n}`,
        label: `${tierLabel} pizza flavor ${n} (${size})`,
        size,
        tier,
      });
    }
  }
  return slots;
}

export function isDealProduct(product: Product) {
  const name = (product.category?.name || "").toLowerCase();
  if (name.includes("deal")) return true;
  return (product.name || "").toLowerCase().includes("deal");
}

export function requiresDealFlavorChoice(product: Product) {
  return (
    isDealProduct(product) &&
    parseDealPizzaSlots(product.description || "").length > 0
  );
}

/** Flavours for a slot: Regular or Special pizza categories with matching size. */
export function flavorsForSlot(
  products: Product[],
  slot: DealPizzaSlot,
): Product[] {
  return products.filter((p) => {
    const cat = (p.category?.name || "").toLowerCase();
    if (slot.tier === "special") {
      // e.g. "Special Pizza", "Krunchies Special Pizza" — not burgers.
      if (!(cat.includes("special") && cat.includes("pizza"))) return false;
      if (cat.includes("regular")) return false;
    } else if (!cat.includes("regular")) {
      return false;
    }
    return (p.sizes || []).some((s) => normalizeSize(s.size) === slot.size);
  });
}

export function normalizeSize(size: string): PizzaSizeCode | null {
  const t = size.trim().toUpperCase();
  if (t === "S" || t === "SMALL") return "S";
  if (t === "M" || t === "MEDIUM") return "M";
  if (t === "L" || t === "LARGE") return "L";
  if (t === "XL" || t === "EXTRA LARGE" || t === "X-LARGE") return "XL";
  return null;
}
