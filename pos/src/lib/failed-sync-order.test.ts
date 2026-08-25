import { describe, expect, it } from "vitest";
import {
  findOrderForFailedAction,
  formatFailedOrderSummary,
  orderIdsFromFailedAction,
} from "./failed-sync-order";
import type { OfflineAction, Order } from "@/types";

function order(partial: Partial<Order> & Pick<Order, "id">): Order {
  return {
    order_number: `KR-${partial.id}`,
    created_at: "2026-08-20T10:00:00.000Z",
    updated_at: "2026-08-20T10:00:00.000Z",
    customer_name: "Ali",
    phone: "03001234567",
    address: "",
    location_id: "loc",
    delivery_charge: 0,
    cash_on_delivery_fee: 0,
    payment_method: "cash",
    order_status: "COMPLETED",
    order_type: "walkin",
    order_notes: "",
    subtotal: 1500,
    discount: 0,
    grand_total: 1500,
    items: [
      {
        id: "l1",
        created_at: "",
        updated_at: "",
        order_id: partial.id,
        product_id: "p1",
        product_size_id: "s1",
        quantity: 1,
        price: 1500,
        product_name: "Chicken Tikka",
        size: "Large",
      },
    ],
    ...partial,
  };
}

describe("failed sync order lookup", () => {
  it("reads localId and client_order_id from CREATE payload", () => {
    const action = {
      id: "a1",
      type: "CREATE_ORDER",
      created_at: "",
      synced: false,
      payload: {
        localId: "LOCAL-1",
        input: { client_order_id: "LOCAL-1", customer_name: "" },
      },
    } as OfflineAction;
    expect(orderIdsFromFailedAction(action)).toEqual(["LOCAL-1", "LOCAL-1"]);
  });

  it("finds the local order and formats a staff-readable summary", () => {
    const action = {
      id: "a1",
      type: "CREATE_ORDER",
      created_at: "",
      synced: false,
      dead: true,
      error: "customer name is required",
      payload: { localId: "o1", input: { client_order_id: "o1" } },
    } as OfflineAction;
    const found = findOrderForFailedAction(action, [order({ id: "o1" })]);
    expect(found?.id).toBe("o1");
    const summary = formatFailedOrderSummary(found);
    expect(summary).toContain("Chicken Tikka");
    expect(summary).toContain("Ali");
    expect(summary).toContain("1,500");
  });
});
