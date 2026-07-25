import { describe, expect, it } from "vitest";
import type { Product } from "@/types";
import {
  flavorsForSlot,
  isDealProduct,
  normalizeSize,
  parseDealPizzaSlots,
} from "./deal-flavors";

function makeProduct(
  id: string,
  categoryName: string,
  sizes: string[],
): Product {
  return {
    id,
    name: `Product ${id}`,
    description: "",
    image: "",
    category: { id: `cat-${categoryName}`, name: categoryName } as Product["category"],
    sizes: sizes.map((s, i) => ({
      id: `${id}-size-${i}`,
      product_id: id,
      size: s,
      price: 100,
    })),
  } as Product;
}

describe("parseDealPizzaSlots", () => {
  it("returns one slot for a single medium pizza", () => {
    const slots = parseDealPizzaSlots("2 Medium Pizza, 1 Fries, 1 Drink");
    expect(slots).toHaveLength(2);
    expect(slots.every((s) => s.size === "M")).toBe(true);
  });

  it("parses large pizzas", () => {
    const slots = parseDealPizzaSlots("1 Large Pizza with drinks");
    expect(slots).toHaveLength(1);
    expect(slots[0].size).toBe("L");
  });

  it("parses XL pizzas", () => {
    const slots = parseDealPizzaSlots("1 XL Pizza Special");
    expect(slots).toHaveLength(1);
    expect(slots[0].size).toBe("XL");
  });

  it("handles multiple sizes across a description", () => {
    const slots = parseDealPizzaSlots("1 Large Pizza and 2 Small Pizzas");
    expect(slots.map((s) => s.size)).toEqual(["L", "S", "S"]);
  });

  it("returns no slots when there is no pizza", () => {
    expect(parseDealPizzaSlots("2 Burgers, 5 Wings, 1 Drink")).toHaveLength(0);
  });
});

describe("normalizeSize", () => {
  it("maps words and codes to size codes", () => {
    expect(normalizeSize("Medium")).toBe("M");
    expect(normalizeSize("l")).toBe("L");
    expect(normalizeSize("Extra Large")).toBe("XL");
    expect(normalizeSize("random")).toBeNull();
  });
});

describe("isDealProduct", () => {
  it("detects products in a Deal category", () => {
    expect(isDealProduct(makeProduct("1", "Deals", ["L"]))).toBe(true);
    expect(isDealProduct(makeProduct("2", "Pizza (Regular Flavour)", ["M"]))).toBe(
      false,
    );
  });
});

describe("flavorsForSlot", () => {
  const products: Product[] = [
    makeProduct("a", "Pizza (Regular Flavour)", ["S", "M", "L"]),
    makeProduct("b", "Pizza (Regular Flavour)", ["M"]),
    makeProduct("c", "Pizza (Regular Flavour)", ["XL"]),
    makeProduct("d", "Pizza (Special Flavour)", ["M"]),
    makeProduct("e", "Deals", ["M"]),
  ];

  it("only returns Regular flavours matching the slot size", () => {
    const medium = flavorsForSlot(products, {
      id: "pizza-1",
      label: "Regular pizza flavor 1 (M)",
      size: "M",
    });
    expect(medium.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("excludes non-regular categories even when the size matches", () => {
    const result = flavorsForSlot(products, {
      id: "pizza-1",
      label: "flavor",
      size: "M",
    });
    expect(result.some((p) => p.id === "d")).toBe(false);
    expect(result.some((p) => p.id === "e")).toBe(false);
  });

  it("returns nothing when no regular flavour has the size", () => {
    const result = flavorsForSlot(
      [makeProduct("x", "Pizza (Regular Flavour)", ["L"])],
      { id: "pizza-1", label: "flavor", size: "XL" },
    );
    expect(result).toHaveLength(0);
  });
});
