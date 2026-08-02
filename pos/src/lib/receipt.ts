import type { Order, OrderItem, Settings } from "@/types";
import { formatPrice } from "@/lib/utils";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Print silently when Chrome was launched with --kiosk-printing
 * (use pos/scripts/Launch-POS.bat). Otherwise the system print dialog appears.
 * Prefer hidden iframe so installed PWAs are not popup-blocked.
 */
function openPrintWindow(html: string, title: string) {
  if (typeof document === "undefined") return false;

  const cleanHtml = html.replace(/<script>[\s\S]*?<\/script>/gi, "");

  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", title);
    iframe.setAttribute("aria-hidden", "true");
    // Must have a tiny non-zero box — some printers skip 0×0 iframes.
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;z-index:-1";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      throw new Error("iframe unavailable");
    }

    doc.open();
    doc.write(cleanHtml);
    doc.title = title;
    doc.close();

    const cleanup = () => {
      try {
        iframe.remove();
      } catch {
        /* ignore */
      }
    };

    const doPrint = () => {
      try {
        win.focus();
        win.print();
      } catch {
        /* ignore */
      } finally {
        // Keep iframe briefly so the print spooler can read the document.
        setTimeout(cleanup, 60_000);
        win.addEventListener?.("afterprint", cleanup, { once: true });
      }
    };

    // Layout thermal HTML before printing.
    setTimeout(doPrint, 120);
    return true;
  } catch {
    const w = window.open("", "_blank", "width=320,height=600");
    if (!w) return false;
    w.document.write(html);
    w.document.title = title;
    w.document.close();
    w.focus();
    setTimeout(() => {
      try {
        w.print();
      } catch {
        /* ignore */
      }
    }, 120);
    return true;
  }
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
  const nested = item.product?.name?.trim();
  if (nested) return nested;
  const flat = (item as { product_name?: string }).product_name?.trim();
  if (flat) return flat;
  return "Item";
}

function itemSize(item: OrderItem) {
  const nested = item.product_size?.size?.trim();
  if (nested) return nested;
  const flat = (item as { size?: string }).size?.trim();
  if (flat) return flat;
  return "-";
}

/**
 * Fill missing product/size names on an order before printing.
 * Handles empty nested `product: {}` objects from API/IndexedDB.
 */
export function ensureReceiptItemNames(
  order: Order,
  nameByProductId?: Map<string, string>,
): Order {
  const items = (order.items || []).map((item) => {
    const fromMap = nameByProductId?.get(item.product_id)?.trim();
    const name =
      item.product?.name?.trim() ||
      (item as { product_name?: string }).product_name?.trim() ||
      fromMap ||
      "Item";
    const size =
      item.product_size?.size?.trim() ||
      (item as { size?: string }).size?.trim() ||
      "-";
    return {
      ...item,
      product: {
        id: item.product_id,
        created_at: item.product?.created_at || "",
        updated_at: item.product?.updated_at || "",
        category_id: item.product?.category_id || "",
        name,
        description: item.product?.description || "",
        image: item.product?.image || "",
        featured: false,
        available: true,
        display_order: 0,
      },
      product_size: {
        id: item.product_size_id,
        created_at: "",
        updated_at: "",
        product_id: item.product_id,
        size,
        price: item.price,
      },
      product_name: name,
      size,
    };
  });
  return { ...order, items: items as Order["items"] };
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
  @page { size: 80mm auto; margin: 2mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.2;
    color: #000;
    width: 72mm;
    margin: 0 auto;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 {
    font-size: 13px;
    font-weight: 800;
    text-align: center;
    margin: 0 0 3px;
    letter-spacing: 0.5px;
    word-break: break-all;
  }
  .banner {
    text-align: center;
    font-weight: 800;
    font-size: 12px;
    border: 1px solid #000;
    padding: 3px 2px;
    margin-bottom: 4px;
    letter-spacing: 0.5px;
  }
  .meta {
    font-size: 10px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .meta div { margin: 1px 0; }
  .item {
    border-top: 1px solid #000;
    padding: 4px 0;
  }
  .row {
    display: flex;
    gap: 4px;
    font-weight: 800;
    font-size: 12px;
  }
  .qty { min-width: 2em; }
  .size {
    font-weight: 700;
    font-size: 10px;
    margin-top: 1px;
  }
  .mod {
    margin-top: 1px;
    font-size: 10px;
    font-weight: 600;
  }
  .notes {
    border-top: 1px solid #000;
    margin-top: 4px;
    padding-top: 3px;
    font-weight: 700;
    font-size: 10px;
  }
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
    buildKitchenReceiptHtml(ensureReceiptItemNames(order)),
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
          ? `<div class="note">${escapeHtml(note)}</div>`
          : meta.notes
            ? `<div class="note">${escapeHtml(meta.notes)}</div>`
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
  const discount = order.discount || 0;
  const tax = 0;
  const notes = stripTableFromNotes(order.order_notes);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt ${escapeHtml(order.order_number || order.id)}</title>
<style>
  @page { size: 80mm auto; margin: 2mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.2;
    color: #000;
    width: 72mm;
    margin: 0 auto;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 {
    font-size: 14px;
    font-weight: 800;
    text-align: center;
    margin: 0 0 2px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }
  .meta {
    text-align: center;
    margin-bottom: 4px;
    font-size: 10px;
    font-weight: 600;
  }
  .info {
    font-size: 10px;
    font-weight: 700;
    margin: 1px 0;
  }
  hr {
    border: none;
    border-top: 1px solid #000;
    margin: 4px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  thead td {
    font-weight: 800;
    font-size: 9px;
    border-bottom: 1px solid #000;
    padding: 2px 0 3px;
  }
  tbody td {
    padding: 3px 0;
    vertical-align: top;
    font-weight: 600;
    border-bottom: 1px dashed #999;
  }
  .note {
    font-size: 9px;
    font-weight: 600;
    margin-top: 1px;
  }
  .total {
    border: 1px solid #000;
    margin-top: 4px;
    padding: 4px 3px;
    font-size: 10px;
    font-weight: 700;
  }
  .line {
    display: flex;
    justify-content: space-between;
    margin: 1px 0;
  }
  .grand {
    font-size: 12px;
    font-weight: 800;
    margin-top: 3px;
    padding-top: 2px;
    border-top: 1px solid #000;
  }
  .notes {
    font-size: 10px;
    font-weight: 700;
    margin-top: 4px;
  }
  .center {
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    margin-top: 4px;
  }
</style>
</head>
<body>
  <h1>${escapeHtml(settings?.restaurant_name || "Krunchies Pizza")}</h1>
  <div class="meta">
    ${escapeHtml(settings?.phone || "")}<br/>
    ${reprint ? "<strong>REPRINT</strong><br/>" : ""}
    ${escapeHtml(when.toLocaleDateString("en-PK"))}<br/>
    ${escapeHtml(when.toLocaleTimeString("en-PK"))}
  </div>
  <div class="info">Order: ${escapeHtml(order.order_number || order.id)}</div>
  <div class="info">Customer: ${escapeHtml(order.customer_name)}</div>
  ${order.phone ? `<div class="info">Phone: ${escapeHtml(order.phone)}</div>` : ""}
  ${order.address ? `<div class="info">Address: ${escapeHtml(order.address)}</div>` : ""}
  <div class="info">Payment: ${escapeHtml((order.payment_method || "").toUpperCase())}</div>
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
    <div class="line grand"><span>TOTAL</span><span>${formatPrice(order.grand_total, currency)}</span></div>
  </div>
  ${notes ? `<p class="notes">Notes: ${escapeHtml(notes)}</p>` : ""}
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
    buildCustomerReceiptHtml(ensureReceiptItemNames(order), settings, reprint),
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
