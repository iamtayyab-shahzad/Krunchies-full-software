/** @deprecated Use discount-rules.ts — kept as thin wrappers for existing imports. */

import {
  bestDiscountLabel,
  discountFromRules,
  eligiblePromoSubtotal,
  isDealLineName,
  type DiscountRule,
  type PromoLine,
} from "@/lib/discount-rules";

export type { PromoLine };
export { eligiblePromoSubtotal, isDealLineName };
export const WEEKEND_PROMO_END_DATE = "2026-08-31";

let cachedRules: DiscountRule[] = [];

/** Update in-memory rules (from API). */
export function setDiscountRulesCache(rules: DiscountRule[]) {
  cachedRules = Array.isArray(rules) ? rules.filter((r) => r.active) : [];
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("discount-rules-updated"));
  }
}

export function getDiscountRulesCache(): DiscountRule[] {
  return cachedRules;
}

/** Fallback matching legacy Fri/Sun 10% if API rules not loaded yet. */
function legacyFallbackRules(): DiscountRule[] {
  return [
    {
      name: "Fri & Sun 10% off",
      active: true,
      percent: 10,
      min_subtotal: 1000,
      schedule_type: "weekdays",
      end_date: WEEKEND_PROMO_END_DATE,
      weekdays_json: "[5,0]",
      exclude_deals: true,
    },
  ];
}

function rulesOrLegacy(): DiscountRule[] {
  return cachedRules.length ? cachedRules : legacyFallbackRules();
}

export function isWeekendPromoDay(date = new Date()): boolean {
  return discountFromRules(rulesOrLegacy(), [{ price: 2000, quantity: 1 }], date) > 0;
}

export function weekendDiscount(lines: PromoLine[], date = new Date()): number {
  return discountFromRules(rulesOrLegacy(), lines, date);
}

export function weekendPromoLabel(date = new Date()): string | null {
  return bestDiscountLabel(
    rulesOrLegacy(),
    [{ price: 2000, quantity: 1, product_name: "Pizza" }],
    date,
  );
}
