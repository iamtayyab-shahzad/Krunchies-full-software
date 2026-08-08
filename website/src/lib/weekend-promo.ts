/** Fri & Sun 10% off non-deal items when eligible subtotal ≥ Rs 1,000 (Asia/Karachi).
 *  Runs through 31 Aug 2026 inclusive; off from 1 Sep 2026. Saturday is not included.
 */

const PROMO_PERCENT = 10;
const PROMO_MIN = 1000;
/** Inclusive last calendar day in Asia/Karachi (YYYY-MM-DD). */
export const WEEKEND_PROMO_END_DATE = "2026-08-31";

function karachiYmd(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function karachiWeekdayShort(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "short",
  }).formatToParts(date);
  return parts.find((p) => p.type === "weekday")?.value || "";
}

/** True only on Friday or Sunday in Karachi, and on/before 31 Aug 2026. */
export function isWeekendPromoDay(date = new Date()): boolean {
  if (karachiYmd(date) > WEEKEND_PROMO_END_DATE) return false;
  const weekday = karachiWeekdayShort(date);
  return weekday === "Fri" || weekday === "Sun";
}

export function isDealLineName(name: string | undefined | null): boolean {
  const n = (name || "").toLowerCase();
  return n.includes("deal") || n.includes("mega combo");
}

export type PromoLine = {
  product_name?: string;
  price: number;
  quantity: number;
  /** Explicit flag from cart/bill when available. */
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
  return "Fri & Sun 10% off (non-deal items, min Rs 1,000 · until 31 Aug)";
}
