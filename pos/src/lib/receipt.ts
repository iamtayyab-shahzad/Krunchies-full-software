import type { Order, OrderItem, Settings } from "@/types";
import { formatPrice } from "@/lib/utils";
import { parseDealIncludedItems } from "@/lib/deal-flavors";
import { isDealLineName } from "@/lib/weekend-promo";
import { isPizzaSizeLabel } from "@/lib/is-pizza";
import { krunchiesProducts } from "@/data/krunchies";

const bundledDescriptionByProductId = new Map(
  krunchiesProducts.map((p) => [p.id, p.description || ""]),
);

const WEBSITE_QR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 33" shape-rendering="crispEdges"><path fill="#fff" d="M0 0h33v33H0z"/><path stroke="#000" d="M4 4.5h7m4 0h1m1 0h1m2 0h1m1 0h7M4 5.5h1m5 0h1m2 0h1m5 0h2m1 0h1m5 0h1M4 6.5h1m1 0h3m1 0h1m1 0h1m1 0h1m7 0h1m1 0h3m1 0h1M4 7.5h1m1 0h3m1 0h1m1 0h3m1 0h4m2 0h1m1 0h3m1 0h1M4 8.5h1m1 0h3m1 0h1m1 0h4m1 0h1m2 0h1m1 0h1m1 0h3m1 0h1M4 9.5h1m5 0h1m1 0h1m1 0h1m4 0h1m2 0h1m5 0h1M4 10.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M12 11.5h3m3 0h1m1 0h1M4 12.5h1m1 0h5m2 0h1m1 0h4m3 0h5M4 13.5h2m1 0h3m2 0h1m1 0h3m3 0h2m1 0h1m3 0h1M5 14.5h4m1 0h1m1 0h1m1 0h3m1 0h8m1 0h2M6 15.5h1m1 0h1m2 0h1m2 0h1m3 0h4m1 0h1m4 0h1M5 16.5h1m2 0h1m1 0h1m1 0h1m1 0h2m1 0h8m1 0h3M4 17.5h1m2 0h2m3 0h3m1 0h1m1 0h1m1 0h2m1 0h1m1 0h1m1 0h1M4 18.5h1m1 0h2m1 0h2m1 0h1m1 0h1m2 0h1m1 0h1m1 0h5m1 0h2M4 19.5h1m3 0h1m2 0h2m3 0h1m1 0h1m2 0h1m1 0h2m3 0h1M4 20.5h1m4 0h3m2 0h1m1 0h2m1 0h6m1 0h1M12 21.5h2m3 0h1m2 0h1m3 0h2M4 22.5h7m3 0h5m1 0h1m1 0h1m1 0h1m1 0h3M4 23.5h1m5 0h1m1 0h1m2 0h1m4 0h1m3 0h2m2 0h1M4 24.5h1m1 0h3m1 0h1m1 0h2m1 0h10m1 0h1M4 25.5h1m1 0h3m1 0h1m1 0h2m2 0h1m1 0h1m1 0h1m1 0h1m1 0h5M4 26.5h1m1 0h3m1 0h1m1 0h1m6 0h2m4 0h2m1 0h1M4 27.5h1m5 0h1m3 0h3m2 0h3m1 0h3m2 0h1M4 28.5h7m1 0h1m1 0h5m4 0h6"/></svg>`;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripPrintScripts(html: string) {
  return html.replace(/<script>[\s\S]*?<\/script>/gi, "");
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

type PrintJob = {
  html: string;
  title: string;
  resolve: (ok: boolean) => void;
};

/** One thermal job at a time — overlapping window.print() kills cheap USB drivers. */
const printQueue: PrintJob[] = [];
let printPumpRunning = false;

/**
 * Print silently when Chrome was launched with --kiosk-printing
 * (use pos/scripts/Launch-POS.bat). Otherwise the system print dialog appears.
 * Jobs are queued so Complete / Reprint / Kitchen never overlap.
 * Resolves true only after the print job actually runs (or false on failure).
 */
function openPrintWindow(html: string, title: string): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    printQueue.push({ html, title, resolve });
    void pumpPrintQueue();
  });
}

async function pumpPrintQueue() {
  if (printPumpRunning) return;
  printPumpRunning = true;
  try {
    while (printQueue.length > 0) {
      const job = printQueue.shift();
      if (!job) break;
      const ok = await runOnePrintJob(job.html, job.title);
      job.resolve(ok);
      // Brief gap so the USB thermal / Windows spooler can finish the prior job.
      await sleep(500);
    }
  } finally {
    printPumpRunning = false;
    if (printQueue.length > 0) void pumpPrintQueue();
  }
}

/**
 * Runs a single print and waits until afterprint (or a short timeout) before
 * tearing down the iframe/popup so the next job cannot collide.
 */
function runOnePrintJob(html: string, title: string): Promise<boolean> {
  const cleanHtml = stripPrintScripts(html);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

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

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
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
          cleanup();
          finish(false);
          return;
        }

        // Spooler only needs the document briefly; 60s iframes stacked under load.
        const safety = window.setTimeout(() => {
          cleanup();
          finish(true);
        }, 3500);

        const onAfter = () => {
          window.clearTimeout(safety);
          // Tiny delay after afterprint so GDI can flush to USB.
          window.setTimeout(() => {
            cleanup();
            finish(true);
          }, 300);
        };
        win.addEventListener?.("afterprint", onAfter, { once: true });
      };

      window.setTimeout(doPrint, 150);
    } catch {
      // Popup fallback — still strip scripts so we only print once.
      const w = window.open("", "_blank", "width=320,height=600");
      if (!w) {
        finish(false);
        return;
      }
      try {
        w.document.write(cleanHtml);
        w.document.title = title;
        w.document.close();
      } catch {
        try {
          w.close();
        } catch {
          /* ignore */
        }
        finish(false);
        return;
      }

      window.setTimeout(() => {
        try {
          w.focus();
          w.print();
        } catch {
          try {
            w.close();
          } catch {
            /* ignore */
          }
          finish(false);
          return;
        }

        const safety = window.setTimeout(() => {
          try {
            w.close();
          } catch {
            /* ignore */
          }
          finish(true);
        }, 3500);

        const onAfter = () => {
          window.clearTimeout(safety);
          window.setTimeout(() => {
            try {
              w.close();
            } catch {
              /* ignore */
            }
            finish(true);
          }, 300);
        };
        w.addEventListener?.("afterprint", onAfter, { once: true });
      }, 150);
    }
  });
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
  flavor?: string;
  notes?: string;
};

/** Encode kitchen modifiers into special_instructions for API persistence. */
export function encodeKitchenInstructions(meta: KitchenLineMeta): string {
  const parts: string[] = [];
  if (meta.crust?.trim()) parts.push(`Crust: ${meta.crust.trim()}`);
  if (meta.toppings?.trim()) parts.push(`Toppings: ${meta.toppings.trim()}`);
  if (meta.extras?.trim()) parts.push(`Extras: ${meta.extras.trim()}`);
  if (meta.flavor?.trim()) parts.push(`Flavor: ${meta.flavor.trim()}`);
  if (meta.notes?.trim()) {
    const notes = meta.notes.trim();
    // Avoid duplicating Flavor: if already passed as notes (drink picker).
    if (!/^Flavor:\s*/i.test(notes)) {
      parts.push(notes);
    } else if (!meta.flavor?.trim()) {
      parts.push(notes);
    }
  }
  return parts.join(" | ");
}

export function decodeKitchenInstructions(
  text?: string | null,
): KitchenLineMeta {
  if (!text?.trim()) return {};
  const crust = text.match(/Crust:\s*([^|]+)/i)?.[1]?.trim();
  const toppings = text.match(/Toppings:\s*([^|]+)/i)?.[1]?.trim();
  const extras = text.match(/Extras:\s*([^|]+)/i)?.[1]?.trim();
  const flavor = text.match(/Flavor:\s*([^|]+)/i)?.[1]?.trim();
  const notes = text
    .split("|")
    .map((p) => p.trim())
    .filter(
      (p) =>
        p &&
        !/^Crust:/i.test(p) &&
        !/^Toppings:/i.test(p) &&
        !/^Extras:/i.test(p) &&
        !/^Flavor:/i.test(p),
    )
    .join(" | ");
  return { crust, toppings, extras, flavor, notes: notes || undefined };
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

/** Pizza S/M/L/XL only — hide Regular/Deal/etc on kitchen and customer tickets. */
function printablePizzaSize(item: OrderItem) {
  const size = itemSize(item);
  if (!size || size === "-") return "";
  return isPizzaSizeLabel(size) ? size : "";
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
        description:
          item.product?.description ||
          (item as { product_description?: string }).product_description ||
          bundledDescriptionByProductId.get(item.product_id) ||
          "",
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
  return {
    ...order,
    items: items as Order["items"],
  };
}

function dealContentsHtml(item: OrderItem) {
  const name = itemName(item);
  const desc =
    item.product?.description ||
    (item as { product_description?: string }).product_description ||
    "";
  if (!isDealLineName(name) && !isDealLineName(desc)) return "";
  const included = parseDealIncludedItems(desc);
  if (!included.length) return "";
  return `<div class="inc">${included
    .map((line) => `<div>- ${escapeHtml(line)}</div>`)
    .join("")}</div>`;
}

export function buildKitchenReceiptHtml(order: Order) {
  const when = new Date(order.created_at || Date.now());
  const date = when.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = when.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const orderNotes = stripTableFromNotes(order.order_notes);
  const itemCount = (order.items || []).length;
  const qtyTotal = (order.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0,
  );

  const itemsHtml = (order.items || [])
    .map((item) => {
      const meta = decodeKitchenInstructions(item.special_instructions);
      const mods = [
        meta.crust ? `Crust: ${meta.crust}` : "",
        meta.toppings ? `Toppings: ${meta.toppings}` : "",
        meta.extras ? `Extras: ${meta.extras}` : "",
        meta.flavor ? `Flavor: ${meta.flavor}` : "",
        meta.notes || "",
      ]
        .filter(Boolean)
        .map((m) => `<div class="mod">${escapeHtml(m)}</div>`)
        .join("");
      const size = printablePizzaSize(item);
      const sizeHtml = size
        ? `<div class="size">${escapeHtml(size)}</div>`
        : "";
      return `
      <div class="item">
        <div class="row">
          <span class="name">${escapeHtml(itemName(item))}</span>
          <span class="qty">${item.quantity}</span>
        </div>
        ${sizeHtml}
        ${dealContentsHtml(item)}
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
  @page { size: 80mm auto; margin: 3mm 2mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.35;
    color: #000;
    width: 72mm;
    max-width: 72mm;
    margin: 0 auto;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .shop {
    text-align: center;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.4px;
    margin: 0 0 4px;
    text-transform: uppercase;
  }
  .banner {
    text-align: center;
    font-weight: 400;
    font-size: 13px;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    padding: 3px 0;
    margin-bottom: 6px;
  }
  .meta {
    font-size: 12px;
    font-weight: 400;
    margin-bottom: 6px;
  }
  .meta div { margin: 1px 0; }
  .head {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    padding: 3px 0;
    font-size: 12px;
    font-weight: 600;
  }
  .item { padding: 4px 0; }
  .row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-weight: 400;
    font-size: 13px;
  }
  .name { flex: 1; padding-right: 4px; }
  .qty { min-width: 12px; text-align: right; }
  .size {
    font-weight: 400;
    font-size: 12px;
    margin-top: 1px;
  }
  .inc {
    margin: 2px 0 0 8px;
    font-size: 12px;
    font-weight: 400;
  }
  .mod {
    margin: 1px 0 0 8px;
    font-size: 12px;
    font-weight: 400;
  }
  .foot {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    padding: 3px 0;
    margin-top: 4px;
    font-size: 12px;
  }
  .notes {
    margin-top: 6px;
    font-weight: 400;
    font-size: 12px;
  }
</style>
</head>
<body>
  <div class="shop">KRUNCHIES PIZZA</div>
  <div class="banner">* Kitchen Order Ticket *</div>
  <div class="meta">
    <div>Ticket No. : ${escapeHtml(order.order_number || order.id)}</div>
    <div>Bill Date : ${escapeHtml(date)} ${escapeHtml(time)}</div>
    <div>Customer : ${escapeHtml(order.customer_name || "—")}</div>
  </div>
  <div class="head"><span>Item</span><span>Quantity</span></div>
  ${itemsHtml || `<div class="item">No items</div>`}
  <div class="foot"><span>Items : ${itemCount}</span><span>Qty : ${qtyTotal}</span></div>
  ${
    orderNotes
      ? `<div class="notes">Notes: ${escapeHtml(orderNotes)}</div>`
      : ""
  }
</body>
</html>`;
}

export function printKitchenReceipt(order: Order): Promise<boolean> {
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
      const size = printablePizzaSize(item);
      const meta = decodeKitchenInstructions(item.special_instructions);
      const extras = [
        meta.crust ? `Crust: ${meta.crust}` : "",
        meta.toppings ? `Toppings: ${meta.toppings}` : "",
        meta.extras ? `Extras: ${meta.extras}` : "",
        meta.flavor ? `Flavor: ${meta.flavor}` : "",
        meta.notes || "",
      ]
        .filter(Boolean)
        .join(" · ");
      const noteHtml = extras
        ? `<div class="note">${escapeHtml(extras)}</div>`
        : "";
      const included = dealContentsHtml(item);
      return `
      <tr>
        <td class="col-item">
          ${escapeHtml(name)}${size ? ` (${escapeHtml(size)})` : ""}
          ${included}
          ${noteHtml}
        </td>
        <td class="col-qty">${item.quantity}</td>
        <td class="col-amt">${formatPrice(item.price * item.quantity, currency)}</td>
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
  @page { size: 80mm auto; margin: 2mm 5mm 2mm 2mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.32;
    color: #000;
    /*
      iTech / 80mm heads clip the far right ~3–5mm.
      Keep content inside a safe width so Amt / 4-digit prices stay visible.
    */
    width: 62mm;
    max-width: 62mm;
    margin: 0;
    padding: 0 4mm 0 0;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 {
    font-size: 16px;
    font-weight: 600;
    text-align: center;
    margin: 0 0 3px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }
  .meta {
    text-align: center;
    margin-bottom: 5px;
    font-size: 12px;
    font-weight: 400;
  }
  .info {
    font-size: 12px;
    font-weight: 400;
    margin: 2px 0;
    word-break: break-word;
  }
  hr {
    border: none;
    border-top: 1px solid #000;
    margin: 5px 0;
  }
  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    font-size: 13px;
  }
  col.col-item { width: auto; }
  col.col-qty { width: 7mm; }
  /* Wide enough for "Rs 9,999" without spilling into the clip zone */
  col.col-amt { width: 24mm; }
  thead td {
    font-weight: 600;
    font-size: 11px;
    border-bottom: 1px solid #000;
    padding: 3px 1px 4px 0;
  }
  tbody td {
    padding: 4px 1px 4px 0;
    vertical-align: top;
    font-weight: 400;
    border-bottom: 1px dashed #999;
  }
  .col-item {
    word-wrap: break-word;
    overflow-wrap: anywhere;
    padding-right: 2px !important;
  }
  .col-qty {
    text-align: center;
    white-space: nowrap;
  }
  .col-amt {
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    overflow: visible;
    padding-right: 0 !important;
  }
  .note, .inc {
    font-size: 11px;
    font-weight: 400;
    margin-top: 1px;
  }
  .inc { padding-left: 4px; }
  .total {
    border: 1px solid #000;
    margin-top: 5px;
    padding: 5px 4px;
    font-size: 12px;
    font-weight: 400;
  }
  .line {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    margin: 2px 0;
  }
  .line span:last-child {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .grand {
    font-size: 14px;
    font-weight: 600;
    margin-top: 4px;
    padding-top: 3px;
    border-top: 1px solid #000;
  }
  .notes {
    font-size: 12px;
    font-weight: 400;
    margin-top: 5px;
  }
  .center {
    text-align: center;
    font-size: 12px;
    font-weight: 400;
    margin-top: 4px;
  }
  .web {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
    padding-top: 4px;
    border-top: 1px solid #000;
  }
  .web svg {
    width: 16mm;
    height: 16mm;
    flex-shrink: 0;
  }
  .web p {
    margin: 0;
    font-size: 11px;
    font-weight: 400;
    line-height: 1.25;
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
    <colgroup>
      <col class="col-item" />
      <col class="col-qty" />
      <col class="col-amt" />
    </colgroup>
    <thead>
      <tr>
        <td class="col-item">Item</td>
        <td class="col-qty">Qty</td>
        <td class="col-amt">Amt</td>
      </tr>
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
  <div class="web">
    ${WEBSITE_QR_SVG}
    <p>Order online &amp; skip the queue<br/>www.krunchies.pk</p>
  </div>
</body>
</html>`;
}

/** Final customer receipt (prices + totals). Works fully offline. */
export function printCustomerReceipt(
  order: Order,
  settings: Settings | null,
  reprint = false,
): Promise<boolean> {
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
): Promise<boolean> {
  return printCustomerReceipt(order, settings, reprint);
}

export function buildReceiptHtml(
  order: Order,
  settings: Settings | null,
  reprint = false,
) {
  return buildCustomerReceiptHtml(order, settings, reprint);
}
