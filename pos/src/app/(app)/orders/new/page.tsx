"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, Trash2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBill } from "@/context/bill-context";
import {
  calcCodFee,
  calcGrandTotal,
  cn,
  formatPrice,
  LAST_RECEIPT_KEY,
  ORDER_TYPES,
  PAYMENT_METHODS,
} from "@/lib/utils";
import { printReceipt } from "@/lib/receipt";
import { deleteDraft, saveDraft } from "@/lib/offline-db";
import {
  categoriesApi,
  locationsApi,
  ordersApi,
  productsApi,
  settingsApi,
} from "@/services/api";
import type { Order, Product, ProductSize } from "@/types";

export default function NewOrderPage() {
  const qc = useQueryClient();
  const bill = useBill();
  const [categoryId, setCategoryId] = useState("all");
  const [busy, setBusy] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: locationsApi.list,
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  });

  const currency = settings?.currency || "Rs";
  const codFee = calcCodFee(
    bill.paymentMethod,
    settings?.cash_on_delivery_fee || 0,
  );
  const grandTotal = calcGrandTotal(bill.subtotal, bill.deliveryCharge, codFee);

  const filtered = useMemo(() => {
    return products
      .filter((p) => p.available)
      .filter((p) => (categoryId === "all" ? true : p.category_id === categoryId))
      .filter((p) => {
        if (!bill.search) return true;
        const q = bill.search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.display_order - b.display_order);
  }, [products, categoryId, bill.search]);

  const onProductClick = (product: Product) => {
    const sizes = product.sizes || [];
    if (!sizes.length) {
      toast.error("No sizes configured for this product");
      return;
    }
    if (sizes.length === 1) {
      bill.addProduct(product, sizes[0]);
      return;
    }
    // Pick first size quickly; staff can change in bill
    bill.addProduct(product, sizes[0]);
    toast.message(`${product.name} added (${sizes[0].size})`);
  };

  const savePending = async () => {
    if (!bill.items.length) {
      toast.error("Add items first");
      return;
    }
    const id = bill.draftId || crypto.randomUUID();
    await saveDraft({
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order_type: bill.orderType,
      customer_name: bill.customerName,
      phone: bill.phone,
      address: bill.address,
      location_id: bill.locationId,
      delivery_charge: bill.deliveryCharge,
      payment_method: bill.paymentMethod,
      order_notes: bill.orderNotes,
      items: bill.items,
    });
    bill.loadDraft({ draftId: id, items: bill.items });
    toast.success("Saved as pending");
  };

  const completeOrder = async (status: "COMPLETED" | "PENDING") => {
    if (!bill.items.length) {
      toast.error("Cart is empty");
      return;
    }
    if (!bill.locationId) {
      toast.error("Select delivery location");
      return;
    }
    if (!bill.customerName || !bill.phone) {
      toast.error("Customer name and phone required");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        customer_name: bill.customerName,
        phone: bill.phone,
        address: bill.address,
        location_id: bill.locationId,
        delivery_charge: bill.deliveryCharge,
        payment_method: bill.paymentMethod,
        order_status: status,
        order_notes: [
          bill.orderNotes,
          ...bill.items
            .filter((i) => i.special_instructions)
            .map((i) => `${i.product_name}: ${i.special_instructions}`),
        ]
          .filter(Boolean)
          .join(" | "),
        subtotal: bill.subtotal,
        grand_total: grandTotal,
        items: bill.items.map((i) => ({
          product_id: i.product_id,
          product_size_id: i.size_id,
          quantity: i.quantity,
          price: i.price,
        })),
      };

      const order = await ordersApi.create(payload, bill.orderType);
      if (bill.draftId) await deleteDraft(bill.draftId);

      localStorage.setItem(LAST_RECEIPT_KEY, JSON.stringify(order));
      if (status === "COMPLETED") {
        printReceipt(order, settings || null);
        toast.success("Order completed & receipt printed");
      } else {
        toast.success("Order saved as pending");
      }

      bill.clearBill();
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      // Offline queue already filled by API layer
      toast.message(
        err instanceof Error
          ? `${err.message}. Queued for sync if offline.`
          : "Queued for sync",
      );
      if (bill.draftId) await deleteDraft(bill.draftId);
      bill.clearBill();
    } finally {
      setBusy(false);
    }
  };

  const cancelBill = () => {
    bill.clearBill();
    toast.message("Bill cleared");
  };

  const reprint = () => {
    try {
      const raw = localStorage.getItem(LAST_RECEIPT_KEY);
      if (!raw) {
        toast.error("No receipt to reprint");
        return;
      }
      printReceipt(JSON.parse(raw) as Order, settings || null, true);
    } catch {
      toast.error("Reprint failed");
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1fr_380px]">
      <div className="flex min-h-0 flex-col overflow-hidden border-r border-zinc-800">
        <div className="flex flex-wrap gap-2 border-b border-zinc-800 p-3">
          <button
            type="button"
            onClick={() => setCategoryId("all")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-bold",
              categoryId === "all"
                ? "bg-orange-500 text-black"
                : "bg-zinc-900 text-zinc-300",
            )}
          >
            All
          </button>
          {categories
            .filter((c) => c.visible)
            .sort((a, b) => a.display_order - b.display_order)
            .map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-bold",
                  categoryId === c.id
                    ? "bg-orange-500 text-black"
                    : "bg-zinc-900 text-zinc-300",
                )}
              >
                {c.name}
              </button>
            ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                currency={currency}
                onAdd={onProductClick}
              />
            ))}
          </div>
          {!filtered.length && (
            <p className="p-8 text-center text-zinc-500">No products found</p>
          )}
        </div>
      </div>

      <aside className="flex min-h-0 flex-col bg-zinc-950">
        <div className="border-b border-zinc-800 p-4">
          <h2 className="text-xl font-black text-white">Current Bill</h2>
          <div className="mt-3 flex gap-2">
            {ORDER_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => bill.setOrderType(t.id)}
                className={cn(
                  "flex-1 rounded-lg px-2 py-2 text-xs font-bold",
                  bill.orderType === t.id
                    ? "bg-orange-500 text-black"
                    : "bg-zinc-900 text-zinc-400",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Customer Name</Label>
              <Input
                value={bill.customerName}
                onChange={(e) => bill.setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={bill.phone}
                onChange={(e) => bill.setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input
              value={bill.address}
              onChange={(e) => bill.setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Delivery Location</Label>
            <Select
              value={bill.locationId}
              onValueChange={(id) => {
                const loc = locations.find((l) => l.id === id);
                bill.setLocation(id, loc?.delivery_charge || 0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} · {formatPrice(l.delivery_charge, currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {bill.items.map((item) => {
              const product = products.find((p) => p.id === item.product_id);
              return (
                <div
                  key={item.key}
                  className="rounded-lg border border-zinc-800 bg-black/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white">{item.product_name}</p>
                      <p className="text-sm text-orange-400">
                        {formatPrice(item.price, currency)} · {item.size}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => bill.remove(item.key)}
                      className="text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {product?.sizes && product.sizes.length > 1 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {product.sizes.map((s: ProductSize) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => bill.changeSize(item.key, s)}
                          className={cn(
                            "rounded px-2 py-1 text-xs font-bold",
                            item.size_id === s.id
                              ? "bg-orange-500 text-black"
                              : "bg-zinc-800 text-zinc-400",
                          )}
                        >
                          {s.size}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-9 w-9"
                      onClick={() => bill.decrease(item.key)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center text-lg font-bold">
                      {item.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-9 w-9"
                      onClick={() => bill.increase(item.key)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span className="ml-auto font-bold text-white">
                      {formatPrice(item.price * item.quantity, currency)}
                    </span>
                  </div>
                  <Input
                    className="mt-2 h-10 text-sm"
                    placeholder="Special instructions"
                    value={item.special_instructions || ""}
                    onChange={(e) =>
                      bill.setInstructions(item.key, e.target.value)
                    }
                  />
                </div>
              );
            })}
            {!bill.items.length && (
              <p className="text-center text-sm text-zinc-500">
                Tap products to add
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Order Notes</Label>
            <Textarea
              value={bill.orderNotes}
              onChange={(e) => bill.setOrderNotes(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2 block">Payment</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => bill.setPaymentMethod(m.id)}
                  className={cn(
                    "rounded-lg px-2 py-3 text-sm font-bold",
                    bill.paymentMethod === m.id
                      ? "bg-orange-500 text-black"
                      : "bg-zinc-900 text-zinc-400",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 rounded-lg border border-zinc-800 p-3 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span>{formatPrice(bill.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Delivery</span>
              <span>{formatPrice(bill.deliveryCharge, currency)}</span>
            </div>
            {codFee > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>COD Fee</span>
                <span>{formatPrice(codFee, currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-800 pt-2 text-lg font-black text-white">
              <span>Grand Total</span>
              <span className="text-orange-400">
                {formatPrice(grandTotal, currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 p-3">
          <Button variant="secondary" onClick={savePending} disabled={busy}>
            Save Pending
          </Button>
          <Button variant="outline" onClick={reprint}>
            <Printer className="h-4 w-4" /> Reprint
          </Button>
          <Button variant="danger" onClick={cancelBill} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={() => completeOrder("COMPLETED")}
            disabled={busy}
          >
            Complete
          </Button>
        </div>
      </aside>
    </div>
  );
}

function ProductTile({
  product,
  currency,
  onAdd,
}: {
  product: Product;
  currency: string;
  onAdd: (p: Product) => void;
}) {
  const minPrice = Math.min(...(product.sizes || []).map((s) => s.price), 0);
  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-left transition hover:border-orange-500"
    >
      <div className="relative aspect-[4/3] bg-zinc-900">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="200px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-600">
            No image
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-1 text-base font-bold text-white">
          {product.name}
        </p>
        <p className="mt-1 text-sm font-semibold text-orange-400">
          From {formatPrice(minPrice, currency)}
        </p>
        {(product.sizes || []).length > 0 && (
          <p className="mt-1 text-xs text-zinc-500">
            {(product.sizes || []).map((s) => s.size).join(" · ")}
          </p>
        )}
      </div>
    </button>
  );
}
