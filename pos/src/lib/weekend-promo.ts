/** Fri–Sun 10% off non-deal items when eligible subtotal ≥ Rs 1,000 (Asia/Karachi). */

const PROMO_PERCENT = 10;
const PROMO_MIN = 1000;

export function isWeekendPromoDay(date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "short",
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  return weekday === "Fri" || weekday === "Sat" || weekday === "Sun";
}

export function isDealLineName(name: string | undefined | null): boolean {
  const n = (name || "").toLowerCase();
  return n.includes("deal") || n.includes("mega combo");
}

export type PromoLine = {
  product_name?: string;
  price: number;
  quantity: number;
  is_deal?: boolean;
};

export function eligiblePromoSubtotal(lines: PromoLine[]): number {
  return lines.reduce((sum, line) => {
    const deal =
      line.is_deal === true ||
      (line.is_deal !== false && isDealLineName(line.product_name));
    if (deal) return sum;
    return sum + line.price * line.quantity;
  }, 0);
}

export function weekendDiscount(lines: PromoLine[], date = new Date()): number {
  if (!isWeekendPromoDay(date)) return 0;
  const eligible = eligiblePromoSubtotal(lines);
  if (eligible < PROMO_MIN) return 0;
  return Math.floor((eligible * PROMO_PERCENT) / 100);
}

export function weekendPromoLabel(date = new Date()): string | null {
  if (!isWeekendPromoDay(date)) return null;
  return "Fri–Sun 10% off (non-deal items, min Rs 1,000)";
}
