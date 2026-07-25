import type { Order, OrderItem, Settings } from "@/types";
import { formatPrice } from "@/lib/utils";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openPrintWindow(html: string, title: string) {
  const w = window.open("", "_blank", "width=320,height=600");
  if (!w) return false;
  w.document.write(html);
  w.document.title = title;
  w.document.close();
  return true;
}

export function kitchenOrderTypeLabel(orderType: string): string {
  if (orderType === "walkin") return "Dine In";
  if (orderType === "phone") return "Delivery";
  if (orderType === "website" || orderType === "guest") return "Delivery";
  return orderType || "Order";
}

/** Parse TABLE:xx from order notes (persisted without schema change). */
export function parseTableNumber(orderNotes?: string | null): string {
  if (!orderNotes) return "";
  const match = orderNotes.match(/(?:^|\|\s*)TABLE:([^\s|]+)/i);
  return match?.[1]?.trim() || "";
}

export function stripTableFromNotes(orderNotes?: string | null): string {
  if (!orderNotes) return "";
  return orderNotes
    .replace(/(?:^|\|\s*)TABLE:[^\s|]+/gi, "")
    .replace(/\s*\|\s*/g, " | ")
    .replace(/^\s*\|\s*|\s*\|\s*$/g, "")
    .trim();
}

export type KitchenLineMeta = {
  crust?: string;
  toppings?: string;
  extras?: string;
  notes?: string;
};

/** Encode kitchen modifiers into special_instructions for API persistence. */
export function encodeKitchenInstructions(meta: KitchenLineMeta): string {
  const parts: string[] = [];
  if (meta.crust?.trim()) parts.push(`Crust: ${meta.crust.trim()}`);
  if (meta.toppings?.trim()) parts.push(`Toppings: ${meta.toppings.trim()}`);
  if (meta.extras?.trim()) parts.push(`Extras: ${meta.extras.trim()}`);
  if (meta.notes?.trim()) parts.push(meta.notes.trim());
  return parts.join(" | ");
}

export function decodeKitchenInstructions(
  text?: string | null,
): KitchenLineMeta {
  if (!text?.trim()) return {};
  const crust = text.match(/Crust:\s*([^|]+)/i)?.[1]?.trim();
  const toppings = text.match(/Toppings:\s*([^|]+)/i)?.[1]?.trim();
  const extras = text.match(/Extras:\s*([^|]+)/i)?.[1]?.trim();
  const notes = text
    .split("|")
    .map((p) => p.trim())
    .filter(
      (p) =>
        p &&
        !/^Crust:/i.test(p) &&
        !/^Toppings:/i.test(p) &&
        !/^Extras:/i.test(p),
    )
    .join(" | ");
  return { crust, toppings, extras, notes: notes || undefined };
}

function itemName(item: OrderItem) {
  return (
    item.product?.name ||
    (item as { product_name?: string }).product_name ||
    "Item"
  );
}

function itemSize(item: OrderItem) {
  return (
    item.product_size?.size ||
    (item as { size?: string }).size ||
    "-"
  );
}

export function buildKitchenReceiptHtml(order: Order) {
  const when = new Date(order.created_at || Date.now());
  const date = when.toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = when.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const table = parseTableNumber(order.order_notes);
  const orderNotes = stripTableFromNotes(order.order_notes);

  const itemsHtml = (order.items || [])
    .map((item) => {
      const meta = decodeKitchenInstructions(item.special_instructions);
      const mods = [
        meta.crust ? `Crust: ${meta.crust}` : "",
        meta.toppings ? `Toppings: ${meta.toppings}` : "",
        meta.extras ? `Extras: ${meta.extras}` : "",
        meta.notes || "",
      ]
        .filter(Boolean)
        .map((m) => `<div class="mod">${escapeHtml(m)}</div>`)
        .join("");
      return `
      <div class="item">
        <div class="row">
          <span class="qty">${item.quantity}x</span>
          <span class="name">${escapeHtml(itemName(item))}</span>
        </div>
        <div class="size">Size: ${escapeHtml(itemSize(item))}</div>
        ${mods}
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>KITCHEN ${escapeHtml(order.order_number || order.id)}</title>
<style>
  @page { size: 80mm auto; margin: 3mm; }
  body { font-family: ui-monospace, Menlo, monospace; font-size: 13px; color: #000; width: 72mm; margin: 0 auto; }
  h1 { font-size: 18px; text-align: center; margin: 0 0 4px; letter-spacing: 1px; }
  .banner { text-align: center; font-weight: 900; border: 2px solid #000; padding: 4px; margin-bottom: 8px; }
  .meta div { margin: 2px 0; }
  .item { border-top: 1px dashed #000; padding: 8px 0; }
  .row { display: flex; gap: 6px; font-weight: 800; font-size: 15px; }
  .qty { min-width: 2.2em; }
  .size { font-weight: 700; margin-top: 2px; }
  .mod { margin-top: 2px; font-size: 12px; }
  .notes { border-top: 2px solid #000; margin-top: 8px; padding-top: 6px; font-weight: 700; }
</style>
</head>
<body>
  <div class="banner">KITCHEN ORDER</div>
  <h1>${escapeHtml(order.order_number || order.id)}</h1>
  <div class="meta">
    <div><strong>Type:</strong> ${escapeHtml(kitchenOrderTypeLabel(order.order_type))}</div>
    <div><strong>Customer:</strong> ${escapeHtml(order.customer_name || "—")}</div>
    ${table ? `<div><strong>Table:</strong> ${escapeHtml(table)}</div>` : ""}
    <div><strong>Date:</strong> ${escapeHtml(date)}</div>
    <div><strong>Time:</strong> ${escapeHtml(time)}</div>
  </div>
  ${itemsHtml || `<div class="item">No items</div>`}
  ${
    orderNotes
      ? `<div class="notes">Order notes: ${escapeHtml(orderNotes)}</div>`
      : ""
  }
  <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 400); };</script>
</body>
</html>`;
}

export function printKitchenReceipt(order: Order) {
  return openPrintWindow(
    buildKitchenReceiptHtml(order),
    `Kitchen ${order.order_number || order.id}`,
  );
}

export function buildCustomerReceiptHtml(
  order: Order,
  settings: Settings | null,
  reprint = false,
) {
  const currency = settings?.currency || "Rs";
  const when = new Date(order.created_at || Date.now());
  const lines = (order.items || [])
    .map((item) => {
      const name = itemName(item);
      const size = itemSize(item);
      const meta = decodeKitchenInstructions(item.special_instructions);
      const note = meta.notes || item.special_instructions || "";
      const noteHtml =
        note && !note.includes("Crust:")
          ? `<div style="font-size:10px">${escapeHtml(note)}</div>`
          : meta.notes
            ? `<div style="font-size:10px">${escapeHtml(meta.notes)}</div>`
            : "";
      return `
      <tr>
        <td>
          ${escapeHtml(name)} (${escapeHtml(size)})
          ${noteHtml}
        </td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${formatPrice(item.price * item.quantity, currency)}</td>
      </tr>`;
    })
    .join("");

  const delivery = order.delivery_charge || 0;
  const cod = order.cash_on_delivery_fee || 0;
  const discount = 0;
  const tax = 0;
  const notes = stripTableFromNotes(order.order_notes);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt ${escapeHtml(order.order_number || order.id)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: #000; width: 72mm; margin: 0 auto; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 4px; }
  .meta { text-align: center; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  .total { border-top: 1px dashed #000; margin-top: 8px; padding-top: 6px; }
  .center { text-align: center; }
  .line { display:flex; justify-content:space-between; }
</style>
</head>
<body>
  <h1>${escapeHtml(settings?.restaurant_name || "Krunchies Pizza")}</h1>
  <div class="meta">
    ${escapeHtml(settings?.phone || "")}<br/>
    ${reprint ? "REPRINT<br/>" : ""}
    ${escapeHtml(when.toLocaleDateString("en-PK"))}<br/>
    ${escapeHtml(when.toLocaleTimeString("en-PK"))}
  </div>
  <div>Order: ${escapeHtml(order.order_number || order.id)}</div>
  <div>Customer: ${escapeHtml(order.customer_name)}</div>
  ${order.phone ? `<div>Phone: ${escapeHtml(order.phone)}</div>` : ""}
  ${order.address ? `<div>Address: ${escapeHtml(order.address)}</div>` : ""}
  <div>Payment: ${escapeHtml((order.payment_method || "").toUpperCase())}</div>
  <hr />
  <table>
    <thead>
      <tr><td>Item</td><td style="text-align:center">Qty</td><td style="text-align:right">Amt</td></tr>
    </thead>
    <tbody>${lines}</tbody>
  </table>
  <div class="total">
    <div class="line"><span>Subtotal</span><span>${formatPrice(order.subtotal, currency)}</span></div>
    ${delivery ? `<div class="line"><span>Delivery</span><span>${formatPrice(delivery, currency)}</span></div>` : ""}
    ${cod ? `<div class="line"><span>COD Fee</span><span>${formatPrice(cod, currency)}</span></div>` : ""}
    ${discount ? `<div class="line"><span>Discount</span><span>-${formatPrice(discount, currency)}</span></div>` : ""}
    ${tax ? `<div class="line"><span>Tax</span><span>${formatPrice(tax, currency)}</span></div>` : ""}
    <div class="line" style="font-weight:bold;font-size:14px;margin-top:4px"><span>TOTAL</span><span>${formatPrice(order.grand_total, currency)}</span></div>
  </div>
  ${notes ? `<p>Notes: ${escapeHtml(notes)}</p>` : ""}
  <p class="center">Thank you!</p>
  <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 400); };</script>
</body>
</html>`;
}

/** Final customer receipt (prices + totals). Works fully offline. */
export function printCustomerReceipt(
  order: Order,
  settings: Settings | null,
  reprint = false,
) {
  return openPrintWindow(
    buildCustomerReceiptHtml(order, settings, reprint),
    `Receipt ${order.order_number || order.id}`,
  );
}

/** @deprecated use printCustomerReceipt */
export function printReceipt(
  order: Order,
  settings: Settings | null,
  reprint = false,
) {
  return printCustomerReceipt(order, settings, reprint);
}

export function buildReceiptHtml(
  order: Order,
  settings: Settings | null,
  reprint = false,
) {
  return buildCustomerReceiptHtml(order, settings, reprint);
}
