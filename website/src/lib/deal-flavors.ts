import type { Product } from "@/types";

export type PizzaSizeCode = "S" | "M" | "L" | "XL";

export type DealPizzaSlot = {
  id: string;
  label: string;
  size: PizzaSizeCode;
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

/** Parse deal description into Regular-pizza flavor slots matching size. */
export function parseDealPizzaSlots(description: string): DealPizzaSlot[] {
  const slots: DealPizzaSlot[] = [];
  const re =
    /(\d+)\s*(small|medium|large|xl|extra\s*large|s|m|l)\s+pizzas?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(description)) !== null) {
    const count = Math.min(8, Math.max(1, Number(match[1]) || 1));
    const sizeToken = match[2].toLowerCase().replace(/\s+/g, " ").trim();
    const size = SIZE_ALIASES[sizeToken] || "L";
    for (let i = 0; i < count; i += 1) {
      const n = slots.length + 1;
      slots.push({
        id: `pizza-${n}`,
        label: `Regular pizza flavor ${n} (${size})`,
        size,
      });
    }
  }
  return slots;
}

export function isDealProduct(product: Product) {
  const name = (product.category?.name || "").toLowerCase();
  return name.includes("deal");
}

/** Only Regular Pizza flavours that have the required size. */
export function flavorsForSlot(
  products: Product[],
  slot: DealPizzaSlot,
): Product[] {
  return products.filter((p) => {
    const cat = (p.category?.name || "").toLowerCase();
    if (!cat.includes("regular")) return false;
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
