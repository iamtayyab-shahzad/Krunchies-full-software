import { describe, expect, it } from "vitest";
import {
  eligiblePromoSubtotal,
  isWeekendPromoDay,
  weekendDiscount,
  weekendPromoLabel,
} from "@/lib/weekend-promo";

describe("weekend promo (Fri & Sun 10% non-deal until 31 Aug 2026)", () => {
  it("applies only Fri/Sun Asia/Karachi (not Saturday)", () => {
    // 2026-08-07 Friday
    expect(isWeekendPromoDay(new Date("2026-08-07T12:00:00+05:00"))).toBe(
      true,
    );
    // 2026-08-08 Saturday
    expect(isWeekendPromoDay(new Date("2026-08-08T12:00:00+05:00"))).toBe(
      false,
    );
    // 2026-08-09 Sunday
    expect(isWeekendPromoDay(new Date("2026-08-09T12:00:00+05:00"))).toBe(
      true,
    );
    // Monday
    expect(isWeekendPromoDay(new Date("2026-08-03T12:00:00+05:00"))).toBe(
      false,
    );
  });

  it("turns off after 31 Aug 2026 even on Friday/Sunday", () => {
    // 2026-09-04 is Friday
    expect(isWeekendPromoDay(new Date("2026-09-04T12:00:00+05:00"))).toBe(
      false,
    );
    // 2026-08-31 is Monday — not promo day anyway
    expect(isWeekendPromoDay(new Date("2026-08-31T12:00:00+05:00"))).toBe(
      false,
    );
    // Last Sunday in August 2026 is Aug 30
    expect(isWeekendPromoDay(new Date("2026-08-30T18:00:00+05:00"))).toBe(
      true,
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

  it("gives 10% when eligible subtotal >= 1000 on Fri/Sun", () => {
    const friday = new Date("2026-08-07T18:00:00+05:00");
    const discount = weekendDiscount(
      [
        { product_name: "Pizza", price: 600, quantity: 2, is_deal: false },
        { product_name: "Deal Special", price: 1999, quantity: 1, is_deal: true },
      ],
      friday,
    );
    expect(discount).toBe(120); // 10% of 1200
    expect(weekendPromoLabel(friday)).toMatch(/Fri & Sun 10%/);
  });

  it("gives zero on Saturday even above min", () => {
    const saturday = new Date("2026-08-08T18:00:00+05:00");
    expect(
      weekendDiscount(
        [{ product_name: "Pizza", price: 2000, quantity: 1 }],
        saturday,
      ),
    ).toBe(0);
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
