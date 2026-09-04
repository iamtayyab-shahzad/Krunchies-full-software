/** Thin wrappers — discount math comes from cached Admin rules. */

import {
  anyRuleMatchesToday,
  bestDiscountLabel,
  bestMatchingRule,
  discountFromRules,
  eligiblePromoSubtotal,
  isDealLineName,
  type DiscountRule,
  type PromoLine,
} from "@/lib/discount-rules";

export type { PromoLine };
export { eligiblePromoSubtotal, isDealLineName };

/** @deprecated Kept for tests/docs only — legacy Fri/Sun promo ended 2026-08-31. */
export const WEEKEND_PROMO_END_DATE = "2026-08-31";

let cachedRules: DiscountRule[] = [];

export function setDiscountRulesCache(rules: DiscountRule[]) {
  cachedRules = Array.isArray(rules) ? rules.filter((r) => r.active) : [];
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("discount-rules-updated"));
  }
}

/** Test helper: clear in-memory rules. */
export function resetDiscountRulesCacheForTests() {
  cachedRules = [];
}

export function getDiscountRulesCache(): DiscountRule[] {
  return cachedRules;
}

/**
 * Only Admin/server (or IDB hydrate) rules. No built-in Fri/Sun fallback —
 * finished offers must stay finished on the till.
 */
function rulesForPricing(): DiscountRule[] {
  return cachedRules;
}

export type ActivePromoInfo = {
  name: string;
  min_subtotal: number;
  percent: number;
};

/** Rule that applies (or would apply) today for UI labels / hints. */
export function activePromoInfo(
  lines?: PromoLine[],
  date = new Date(),
): ActivePromoInfo | null {
  const rule = bestMatchingRule(rulesForPricing(), date, lines);
  if (!rule?.name) return null;
  return {
    name: rule.name,
    min_subtotal: rule.min_subtotal || 0,
    percent: rule.percent,
  };
}

export function isWeekendPromoDay(date = new Date()): boolean {
  return anyRuleMatchesToday(rulesForPricing(), date);
}

export function weekendDiscount(lines: PromoLine[], date = new Date()): number {
  return discountFromRules(rulesForPricing(), lines, date);
}

export function weekendPromoLabel(
  linesOrDate?: PromoLine[] | Date,
  date = new Date(),
): string | null {
  if (linesOrDate instanceof Date) {
    return activePromoInfo(undefined, linesOrDate)?.name || null;
  }
  if (Array.isArray(linesOrDate)) {
    return (
      bestDiscountLabel(rulesForPricing(), linesOrDate, date) ||
      activePromoInfo(linesOrDate, date)?.name ||
      null
    );
  }
  return activePromoInfo(undefined, date)?.name || null;
}
