import { describe, expect, it } from "vitest";
import {
  eligiblePromoSubtotal,
  isWeekendPromoDay,
  weekendDiscount,
  weekendPromoLabel,
} from "@/lib/weekend-promo";

describe("weekend promo (Fri-Sun 10% non-deal)", () => {
  it("applies only Fri/Sat/Sun Asia/Karachi", () => {
    // 2026-08-07 is Friday in Karachi
    expect(isWeekendPromoDay(new Date("2026-08-07T12:00:00+05:00"))).toBe(
      true,
    );
    // Monday
    expect(isWeekendPromoDay(new Date("2026-08-03T12:00:00+05:00"))).toBe(
      false,
    );
  });

  it("excludes deal items from eligible subtotal", () => {
    const eligible = eligiblePromoSubtotal([
      { product_name: "Chicken Tikka", price: 800, quantity: 1, is_deal: false },
      { product_name: "Family Deal", price: 2000, quantity: 1, is_deal: true },
      { product_name: "Mega Combo Box", price: 1500, quantity: 1 },
    ]);
    expect(eligible).toBe(800);
  });

  it("gives 10% when eligible subtotal >= 1000 on weekend", () => {
    const friday = new Date("2026-08-07T18:00:00+05:00");
    const discount = weekendDiscount(
      [
        { product_name: "Pizza", price: 600, quantity: 2, is_deal: false },
        { product_name: "Deal Special", price: 1999, quantity: 1, is_deal: true },
      ],
      friday,
    );
    expect(discount).toBe(120); // 10% of 1200
    expect(weekendPromoLabel(friday)).toMatch(/Fri–Sun 10%/);
  });

  it("gives zero below Rs 1000 eligible or on weekday", () => {
    const friday = new Date("2026-08-07T18:00:00+05:00");
    const monday = new Date("2026-08-03T18:00:00+05:00");
    expect(
      weekendDiscount(
        [{ product_name: "Pizza", price: 500, quantity: 1 }],
        friday,
      ),
    ).toBe(0);
    expect(
      weekendDiscount(
        [{ product_name: "Pizza", price: 2000, quantity: 1 }],
        monday,
      ),
    ).toBe(0);
  });
});
