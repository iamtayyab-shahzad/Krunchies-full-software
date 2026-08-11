import { describe, expect, it } from "vitest";
import {
  buildCustomerReceiptHtml,
  buildKitchenReceiptHtml,
  ensureReceiptItemNames,
} from "./receipt";
import { parseDealIncludedItems } from "./deal-flavors";
import type { Order, OrderItem } from "../types";

function baseOrder(items: OrderItem[]): Order {
  return {
    id: "ord-1",
    created_at: "2026-07-30T10:00:00.000Z",
    updated_at: "2026-07-30T10:00:00.000Z",
    order_number: "LOCAL-TEST01",
    customer_name: "Walk-in Customer",
    phone: "0000000000",
    address: "In Store",
    location_id: "walkin",
    delivery_charge: 0,
    cash_on_delivery_fee: 0,
    payment_method: "cash",
    order_status: "COMPLETED",
    order_type: "walkin",
    order_notes: "",
    subtotal: 750,
    grand_total: 750,
    items,
  };
}

describe("receipt product names", () => {
  it("shows name when nested product is missing", () => {
    const order = ensureReceiptItemNames(
      baseOrder([
        {
          id: "i1",
          created_at: "",
          updated_at: "",
          order_id: "ord-1",
          product_id: "p1",
          product_size_id: "s1",
          quantity: 2,
          price: 375,
          product_name: "Tikka Roll",
          size: "Regular",
        },
      ]),
    );
    const html = buildCustomerReceiptHtml(order, {
      id: "settings",
      created_at: "",
      updated_at: "",
      restaurant_name: "Krunchies Pizza",
      currency: "Rs",
    } as never);
    expect(html).toContain("Tikka Roll");
    expect(html).not.toMatch(/>\s*Item\s*\(/);
  });

  it("fills blank nested product from product map", () => {
    const map = new Map([["p1", "Chicken Fajita"]]);
    const order = ensureReceiptItemNames(
      baseOrder([
        {
          id: "i1",
          created_at: "",
          updated_at: "",
          order_id: "ord-1",
          product_id: "p1",
          product_size_id: "s1",
          quantity: 1,
          price: 999,
          product: {
            id: "p1",
            created_at: "",
            updated_at: "",
            category_id: "",
            name: "",
            description: "",
            image: "",
            featured: false,
            available: true,
            display_order: 0,
          },
        },
      ]),
      map,
    );
    expect(order.items?.[0]?.product?.name).toBe("Chicken Fajita");
    const html = buildCustomerReceiptHtml(order, null);
    expect(html).toContain("Chicken Fajita");
  });

  it("preserves stored discount (does not recompute money)", () => {
    const order = ensureReceiptItemNames(
      {
        ...baseOrder([
          {
            id: "i1",
            created_at: "",
            updated_at: "",
            order_id: "ord-1",
            product_id: "p1",
            product_size_id: "s1",
            quantity: 1,
            price: 2000,
            product_name: "Chicken Fajita",
          },
        ]),
        discount: 200,
        grand_total: 1800,
        subtotal: 2000,
      },
    );
    expect(order.discount).toBe(200);
    expect(order.grand_total).toBe(1800);
  });

  it("prints crust/toppings on customer receipt", () => {
    const order = ensureReceiptItemNames(
      baseOrder([
        {
          id: "i1",
          created_at: "",
          updated_at: "",
          order_id: "ord-1",
          product_id: "p1",
          product_size_id: "s1",
          quantity: 1,
          price: 999,
          special_instructions: "Crust: Thin | Toppings: Extra Cheese",
          product_name: "Chicken Fajita",
        },
      ]),
    );
    const html = buildCustomerReceiptHtml(order, null);
    expect(html).toContain("Crust: Thin");
    expect(html).toContain("Toppings: Extra Cheese");
  });
});

describe("kitchen ticket layout", () => {
  it("puts quantity on the right and uses normal weight", () => {
    const order = ensureReceiptItemNames(
      baseOrder([
        {
          id: "i1",
          created_at: "",
          updated_at: "",
          order_id: "ord-1",
          product_id: "p1",
          product_size_id: "s1",
          quantity: 4,
          price: 375,
          product_name: "TIKKA ROLL",
          size: "Regular",
        },
      ]),
    );
    const html = buildKitchenReceiptHtml(order);
    expect(html).toContain("Item");
    expect(html).toContain("Quantity");
    expect(html).toMatch(
      /class="name">TIKKA ROLL<\/span>\s*<span class="qty">4<\/span>/,
    );
    expect(html).not.toMatch(/class="qty">4x/);
    expect(html).not.toContain("font-weight: 800");
    expect(html).not.toContain("www.krunchies.pk");
  });

  it("lists items included in a deal", () => {
    const order = ensureReceiptItemNames(
      baseOrder([
        {
          id: "i1",
          created_at: "",
          updated_at: "",
          order_id: "ord-1",
          product_id: "20000000-0000-4000-8000-000000000090",
          product_size_id: "s1",
          quantity: 1,
          price: 699,
          product_name: "Deal 1",
          product_description:
            "1 Zinger Burger, 5 Hot Wings and 1 Regular Drink.",
          size: "Deal",
        },
      ]),
    );
    const kitchen = buildKitchenReceiptHtml(order);
    expect(kitchen).toContain("1 Zinger Burger");
    expect(kitchen).toContain("5 Hot Wings");
    expect(kitchen).toContain("1 Regular Drink");
    const customer = buildCustomerReceiptHtml(order, null);
    expect(customer).toContain("1 Zinger Burger");
    expect(customer).toContain("www.krunchies.pk");
    expect(customer).toContain("Order online");
    expect(customer).toContain("viewBox=\"0 0 33 33\"");
    expect(customer).not.toContain("font-weight: 800");
  });
});

describe("parseDealIncludedItems", () => {
  it("splits flyer deal descriptions for the cook", () => {
    expect(
      parseDealIncludedItems(
        "1 Large Pizza, 2 Zinger Burgers, 1 Masala Fries and 1.5 L Drink.",
      ),
    ).toEqual([
      "1 Large Pizza",
      "2 Zinger Burgers",
      "1 Masala Fries",
      "1.5 L Drink",
    ]);
  });
});
