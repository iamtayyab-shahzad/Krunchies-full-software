import type { Order, Settings } from "@/types";
import { formatPrice } from "@/lib/utils";

export function buildReceiptHtml(
  order: Order,
  settings: Settings | null,
  reprint = false,
) {
  const currency = settings?.currency || "Rs";
  const lines = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td>${item.product?.name || "Item"} (${item.product_size?.size || "-"})</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${formatPrice(item.price * item.quantity, currency)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt ${order.id.slice(0, 8)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { font-family: ui-monospace, monospace; font-size: 12px; color: #000; width: 72mm; margin: 0 auto; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 4px; }
  .meta { text-align: center; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  .total { border-top: 1px dashed #000; margin-top: 8px; padding-top: 6px; }
  .center { text-align: center; }
</style>
</head>
<body>
  <h1>${settings?.restaurant_name || "Krunchies Pizza"}</h1>
  <div class="meta">
    ${settings?.phone || ""}<br/>
    ${reprint ? "REPRINT<br/>" : ""}
    ${new Date(order.created_at).toLocaleString()}
  </div>
  <div>Order: ${order.id.slice(0, 8).toUpperCase()}</div>
  <div>Customer: ${order.customer_name}</div>
  <div>Phone: ${order.phone}</div>
  ${order.address ? `<div>Address: ${order.address}</div>` : ""}
  <div>Payment: ${order.payment_method.toUpperCase()}</div>
  <hr />
  <table>
    <thead>
      <tr><td>Item</td><td style="text-align:center">Qty</td><td style="text-align:right">Amt</td></tr>
    </thead>
    <tbody>${lines}</tbody>
  </table>
  <div class="total">
    <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${formatPrice(order.subtotal, currency)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Delivery</span><span>${formatPrice(order.delivery_charge, currency)}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;margin-top:4px"><span>TOTAL</span><span>${formatPrice(order.grand_total, currency)}</span></div>
  </div>
  ${order.order_notes ? `<p>Notes: ${order.order_notes}</p>` : ""}
  <p class="center">Thank you!</p>
  <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 400); };</script>
</body>
</html>`;
}

export function printReceipt(
  order: Order,
  settings: Settings | null,
  reprint = false,
) {
  const html = buildReceiptHtml(order, settings, reprint);
  const w = window.open("", "_blank", "width=320,height=600");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
