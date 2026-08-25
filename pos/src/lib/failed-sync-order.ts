/** Resolve a local order linked to a failed sync queue action for Settings UI. */

import type { OfflineAction, Order } from "@/types";

export function orderIdsFromFailedAction(action: OfflineAction): string[] {
  const ids: string[] = [];
  const payload = action.payload;
  if (!payload || typeof payload !== "object") return ids;
  const p = payload as Record<string, unknown>;

  if (typeof p.localId === "string" && p.localId) ids.push(p.localId);
  if (typeof p.id === "string" && p.id) ids.push(p.id);

  const input = p.input;
  if (input && typeof input === "object") {
    const clientId = (input as { client_order_id?: string }).client_order_id;
    if (typeof clientId === "string" && clientId) ids.push(clientId);
  }
  return ids;
}

export function findOrderForFailedAction(
  action: OfflineAction,
  orders: Order[],
): Order | null {
  const ids = new Set(orderIdsFromFailedAction(action));
  if (!ids.size) return null;
  return (
    orders.find(
      (o) =>
        ids.has(o.id) ||
        (o.client_order_id ? ids.has(o.client_order_id) : false),
    ) || null
  );
}

export function formatFailedOrderSummary(order: Order | null): string | null {
  if (!order) return null;
  const when = order.created_at
    ? new Date(order.created_at).toLocaleString("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";
  const items = (order.items || [])
    .map((i) => {
      const name =
        i.product_name ||
        i.product?.name ||
        "Item";
      const size = i.size || i.product_size?.size || "";
      return `${i.quantity}× ${name}${size ? ` (${size})` : ""}`;
    })
    .join(", ");
  const total = `Rs ${Number(order.grand_total || 0).toLocaleString("en-PK")}`;
  const parts = [
    order.order_number || order.id.slice(0, 8),
    order.customer_name || null,
    items || null,
    total,
    when || null,
  ].filter(Boolean);
  return parts.join(" · ");
}
