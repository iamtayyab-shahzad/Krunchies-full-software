import { describe, expect, it } from "vitest";
import {
  isDisplayableSizeLabel,
  isPizzaSizeLabel,
  pizzaSellableSizes,
  sellableSizes,
} from "./is-pizza";

describe("pizzaSellableSizes", () => {
  it("hides Regular and Deal from pizza cards", () => {
    const sizes = pizzaSellableSizes([
      { size: "S", price: 650 },
      { size: "Regular", price: 650 },
      { size: "L", price: 1400 },
      { size: "Deal", price: 1 },
    ]);
    expect(sizes.map((s) => s.size)).toEqual(["S", "L"]);
  });

  it("accepts pizza labels only", () => {
    expect(isPizzaSizeLabel("XL")).toBe(true);
    expect(isPizzaSizeLabel("Regular")).toBe(false);
  });
});

describe("sellableSizes", () => {
  it("keeps every size for non-pizza products (Full / Small)", () => {
    const product = {
      category_id: "bbq",
      category: { id: "bbq", name: "BBQ", has_sizes: false },
      sizes: [
        { size: "Full", price: 1200 },
        { size: "Small", price: 700 },
      ],
    };
    expect(sellableSizes(product).map((s) => s.size)).toEqual([
      "Full",
      "Small",
    ]);
  });

  it("still filters pizza products down to S/M/L/XL", () => {
    const product = {
      category_id: "pz",
      category: { id: "pz", name: "Pizza", has_sizes: true },
      sizes: [
        { size: "Regular", price: 650 },
        { size: "M", price: 900 },
        { size: "L", price: 1400 },
      ],
    };
    expect(sellableSizes(product).map((s) => s.size)).toEqual(["M", "L"]);
  });
});

describe("isDisplayableSizeLabel", () => {
  it("shows meaningful sizes and hides placeholders", () => {
    expect(isDisplayableSizeLabel("Full")).toBe(true);
    expect(isDisplayableSizeLabel("Small")).toBe(true);
    expect(isDisplayableSizeLabel("L")).toBe(true);
    expect(isDisplayableSizeLabel("Regular")).toBe(false);
    expect(isDisplayableSizeLabel("Deal")).toBe(false);
    expect(isDisplayableSizeLabel("")).toBe(false);
    expect(isDisplayableSizeLabel(undefined)).toBe(false);
  });
});
