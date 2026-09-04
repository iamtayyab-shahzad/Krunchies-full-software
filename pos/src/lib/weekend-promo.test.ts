import { describe, expect, it } from "vitest";
import {
  activePromoInfo,
  eligiblePromoSubtotal,
  isWeekendPromoDay,
  resetDiscountRulesCacheForTests,
  setDiscountRulesCache,
  weekendDiscount,
  weekendPromoLabel,
} from "@/lib/weekend-promo";

describe("discount rules (server/IDB only — no legacy Fri/Sun fallback)", () => {
  it("applies nothing until rules are hydrated from server", () => {
    resetDiscountRulesCacheForTests();
    const friday = new Date("2026-08-07T12:00:00+05:00");
    expect(isWeekendPromoDay(friday)).toBe(false);
    expect(
      weekendDiscount(
        [{ product_name: "Pizza", price: 2000, quantity: 1 }],
        friday,
      ),
    ).toBe(0);
  });

  it("excludes deal items from eligible subtotal", () => {
    const eligible = eligiblePromoSubtotal([
      { product_name: "Chicken Tikka", price: 800, quantity: 1, is_deal: false },
      { product_name: "Family Deal", price: 2000, quantity: 1, is_deal: true },
      { product_name: "Mega Combo Box", price: 1500, quantity: 1 },
    ]);
    expect(eligible).toBe(800);
  });

  it("uses cached Azaadi rule name and min for labels", () => {
    const thursday = new Date("2026-08-13T12:00:00+05:00");
    setDiscountRulesCache([
      {
        name: "Azaadi Discount",
        active: true,
        percent: 20,
        min_subtotal: 2000,
        schedule_type: "date_range",
        start_date: "2026-08-13",
        end_date: "2026-08-14",
        exclude_deals: true,
      },
    ]);
    const info = activePromoInfo(undefined, thursday);
    expect(info?.name).toBe("Azaadi Discount");
    expect(info?.min_subtotal).toBe(2000);
    expect(
      weekendDiscount(
        [{ product_name: "Pizza", price: 3330, quantity: 1 }],
        thursday,
      ),
    ).toBe(666);
    expect(
      weekendPromoLabel(
        [{ product_name: "Pizza", price: 3330, quantity: 1 }],
        thursday,
      ),
    ).toBe("Azaadi Discount");
    setDiscountRulesCache([]);
  });

  it("stops promo when admin clears rules (empty server list)", () => {
    const friday = new Date("2026-08-07T18:00:00+05:00");
    setDiscountRulesCache([
      {
        name: "Fri & Sun 10% off",
        active: true,
        percent: 10,
        min_subtotal: 1000,
        schedule_type: "weekdays",
        weekdays_json: "[5,0]",
        exclude_deals: true,
      },
    ]);
    expect(isWeekendPromoDay(friday)).toBe(true);
    setDiscountRulesCache([]); // offer finished
    expect(isWeekendPromoDay(friday)).toBe(false);
    expect(
      weekendDiscount(
        [{ product_name: "Pizza", price: 2000, quantity: 1 }],
        friday,
      ),
    ).toBe(0);
    expect(weekendPromoLabel(undefined, friday)).toBeNull();
  });
});
