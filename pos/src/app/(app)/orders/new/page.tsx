"use client";

import Image from "next/image";
import { memo, useEffect, useMemo, useState } from "react";
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
import { DealFlavorDialog } from "@/components/deal-flavor-dialog";
import { requiresDealFlavorChoice } from "@/lib/deal-flavors";
import {
  calcCodFee,
  calcGrandTotal,
  cn,
  formatPkPhone,
  formatPrice,
  isValidPkPhone,
  LAST_RECEIPT_KEY,
  normalizePkPhone,
  ORDER_TYPES,
  paymentsForOrderType,
  WALKIN_LOCATION_ID,
} from "@/lib/utils";
import { printCustomerReceipt, printKitchenReceipt, encodeKitchenInstructions } from "@/lib/receipt";
import { deleteDraft } from "@/lib/offline-db";
import { isOnline } from "@/lib/network";
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
  const [dealProduct, setDealProduct] = useState<Product | null>(null);
  const isWalkin = bill.orderType === "walkin";
  const paymentOptions = paymentsForOrderType(bill.orderType);

  useEffect(() => {
    if (bill.cartRecovered && bill.items.length) {
      toast.message("Cart restored from offline draft");
    }
    // only once when recovered with items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill.cartRecovered]);

  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useQuery({
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

  const deliveryLocations = useMemo(
    () => locations.filter((l) => l.id !== WALKIN_LOCATION_ID),
    [locations],
  );

  const currency = settings?.currency || "Rs";
  const deliveryCharge = isWalkin ? 0 : bill.deliveryCharge;
  const codFee = calcCodFee(
    bill.paymentMethod,
    settings?.cash_on_delivery_fee || 0,
  );
  const grandTotal = calcGrandTotal(bill.subtotal, deliveryCharge, codFee);

  const productsWithCategories = useMemo(() => {
    const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
    return products.map((p) => ({
      ...p,
      category: p.category || byId[p.category_id],
    }));
  }, [products, categories]);

  const filtered = useMemo(() => {
    return productsWithCategories
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
  }, [productsWithCategories, categoryId, bill.search]);

  const onProductClick = (product: Product) => {
    const sizes = product.sizes || [];
    if (!sizes.length) {
      toast.error("No sizes configured for this product");
      return;
    }
    if (requiresDealFlavorChoice(product)) {
      setDealProduct(product);
      return;
    }
    bill.addProduct(product, sizes[0]);
    if (sizes.length > 1) {
      toast.message(`${product.name} added (${sizes[0].size})`);
    }
  };

  const onDealConfirm = (
    product: Product,
    size: ProductSize,
    flavorNote: string,
  ) => {
    bill.addProduct(product, size, { special_instructions: flavorNote });
    toast.success(`${product.name} added with pizza flavors`);
  };

  const buildPayload = () => {
    const notes = [bill.orderNotes.trim()];
    if (isWalkin && bill.tableNumber.trim()) {
      notes.push(`TABLE:${bill.tableNumber.trim()}`);
    }
    return {
      customer_name: isWalkin ? "Walk-in Customer" : bill.customerName.trim(),
      phone: isWalkin ? "0000000000" : normalizePkPhone(bill.phone),
      address: isWalkin ? "In Store" : bill.address.trim(),
      location_id: isWalkin ? WALKIN_LOCATION_ID : bill.locationId,
      payment_method: bill.paymentMethod,
      order_notes: notes.filter(Boolean).join(" | "),
      items: bill.items.map((i) => ({
        product_id: i.product_id,
        product_size_id: i.size_id,
        quantity: i.quantity,
        price: i.price,
        special_instructions: encodeKitchenInstructions({
          crust: i.crust,
          toppings: i.toppings,
          extras: i.extras,
          notes: i.special_instructions,
        }),
      })),
    };
  };

  /** Ensure kitchen/customer receipts have product names even offline. */
  const enrichOrderForPrint = (order: Order): Order => ({
    ...order,
    items: (order.items || []).map((item, idx) => {
      const billLine = bill.items[idx];
      const match =
        billLine &&
        billLine.product_id === item.product_id &&
        billLine.size_id === item.product_size_id
          ? billLine
          : bill.items.find(
              (b) =>
                b.product_id === item.product_id &&
                b.size_id === item.product_size_id &&
                (b.special_instructions || "") ===
                  (item.special_instructions || b.special_instructions || ""),
            ) ||
            bill.items.find(
              (b) =>
                b.product_id === item.product_id &&
                b.size_id === item.product_size_id,
            ) ||
            billLine;
      return {
        ...item,
        product: item.product || {
          id: item.product_id,
          created_at: "",
          updated_at: "",
          category_id: "",
          name: match?.product_name || "Item",
          description: "",
          image: match?.product_image || "",
          featured: false,
          available: true,
          display_order: 0,
        },
        product_size: item.product_size || {
          id: item.product_size_id,
          created_at: "",
          updated_at: "",
          product_id: item.product_id,
          size: match?.size || "-",
          price: item.price,
        },
        special_instructions:
          item.special_instructions ||
          encodeKitchenInstructions({
            crust: match?.crust,
            toppings: match?.toppings,
            extras: match?.extras,
            notes: match?.special_instructions,
          }),
      };
    }),
  });

  const validate = () => {
    if (!bill.items.length) {
      toast.error("Cart is empty");
      return false;
    }
    if (!paymentOptions.some((p) => p.id === bill.paymentMethod)) {
      toast.error("Select a valid payment method");
      return false;
    }
    if (isWalkin) return true;
    if (!bill.customerName.trim() || !bill.phone.trim()) {
      toast.error("Customer name and phone required");
      return false;
    }
    if (!isValidPkPhone(bill.phone)) {
      toast.error("Enter a valid 11-digit mobile number (e.g. 0300-1234567)");
      return false;
    }
    if (!bill.locationId || bill.locationId === WALKIN_LOCATION_ID) {
      toast.error("Select delivery location");
      return false;
    }
    if (!bill.address.trim()) {
      toast.error("Delivery address required");
      return false;
    }
    return true;
  };

  const placeOrder = async (status: "COMPLETED" | "PENDING") => {
    if (!validate()) return;

    setBusy(true);
    try {
      const payload = buildPayload();
      let order: Order;
      if (bill.editingOrderId) {
        await ordersApi.update(bill.editingOrderId, {
          customer_name: payload.customer_name,
          phone: payload.phone,
          address: payload.address,
          location_id: payload.location_id,
          payment_method: payload.payment_method,
          order_notes: payload.order_notes,
          items: payload.items,
        });
        if (status === "COMPLETED") {
          await ordersApi.complete(bill.editingOrderId);
        }
        order = await ordersApi.get(bill.editingOrderId);
      } else {
        order = await ordersApi.create(payload, bill.orderType);
        if (status === "COMPLETED") {
          await ordersApi.complete(order.id);
          order = await ordersApi.get(order.id);
        }
      }
      if (bill.draftId) await deleteDraft(bill.draftId);

      const printable = enrichOrderForPrint(order);
      localStorage.setItem(LAST_RECEIPT_KEY, JSON.stringify(printable));
      const offline =
        !isOnline() ||
        order.order_number?.startsWith("LOCAL-") ||
        order.sync_status === "pending_sync";
      if (status === "COMPLETED") {
        printCustomerReceipt(printable, settings || null);
        toast.success(
          offline
            ? "Order completed offline — customer receipt printed, queued to sync"
            : bill.editingOrderId
              ? "Order updated & completed"
              : "Order completed & customer receipt printed",
        );
      } else {
        printKitchenReceipt(printable);
        toast.success(
          offline
            ? "Pending saved offline — kitchen receipt printed"
            : bill.editingOrderId
              ? "Pending updated — kitchen receipt printed"
              : "Saved to Pending — kitchen receipt printed",
        );
      }

      bill.clearBill();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["orders"] }),
        qc.invalidateQueries({ queryKey: ["orders", "pending"] }),
      ]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to place order",
      );
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
      printCustomerReceipt(JSON.parse(raw) as Order, settings || null, true);
    } catch {
      toast.error("Reprint failed");
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1fr_380px]">
      <div className="flex min-h-0 flex-col overflow-hidden border-r border-zinc-800">
        {productsLoading ? (
          <div className="flex flex-1 items-center justify-center p-8 text-zinc-400">
            Loading menu…
          </div>
        ) : null}
        {productsError ? (
          <div className="m-3 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            Could not load products.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void refetchProducts()}
            >
              Retry
            </button>
          </div>
        ) : null}
        {!productsLoading && !productsError && products.length === 0 ? (
          <div className="m-3 rounded-lg border border-orange-500/40 bg-orange-500/10 p-4 text-sm text-orange-200">
            No products cached. Connect to the internet once to sync the menu.
          </div>
        ) : null}
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
              <MemoProductTile
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
          <h2 className="text-xl font-black text-white">
            {bill.editingOrderId ? "Editing Pending Order" : "Current Bill"}
          </h2>
          {bill.editingOrderId ? (
            <p className="mt-1 text-xs text-amber-300">
              Changes will update the existing pending order.
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            {ORDER_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={Boolean(bill.editingOrderId)}
                onClick={() => bill.setOrderType(t.id)}
                className={cn(
                  "flex-1 rounded-lg px-2 py-2 text-xs font-bold",
                  bill.orderType === t.id
                    ? "bg-orange-500 text-black"
                    : "bg-zinc-900 text-zinc-400",
                  bill.editingOrderId && "opacity-60",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {!isWalkin && (
            <>
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
                    inputMode="numeric"
                    placeholder="0300-1234567"
                    maxLength={12}
                    value={bill.phone}
                    onChange={(e) =>
                      bill.setPhone(formatPkPhone(e.target.value))
                    }
                  />
                  {bill.phone.trim() && !isValidPkPhone(bill.phone) ? (
                    <p className="text-xs text-red-400">
                      Enter an 11-digit number starting with 03
                    </p>
                  ) : null}
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
                  value={bill.locationId || undefined}
                  onValueChange={(id) => {
                    const loc = deliveryLocations.find((l) => l.id === id);
                    bill.setLocation(id, loc?.delivery_charge || 0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryLocations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} · {formatPrice(l.delivery_charge, currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {isWalkin ? (
            <div className="space-y-1">
              <Label>Table Number (optional)</Label>
              <Input
                value={bill.tableNumber}
                placeholder="e.g. 5"
                onChange={(e) => bill.setTableNumber(e.target.value)}
              />
            </div>
          ) : null}

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
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Input
                      className="h-9 text-xs"
                      placeholder="Crust"
                      value={item.crust || ""}
                      onChange={(e) =>
                        bill.setLineMeta(item.key, { crust: e.target.value })
                      }
                    />
                    <Input
                      className="h-9 text-xs"
                      placeholder="Toppings"
                      value={item.toppings || ""}
                      onChange={(e) =>
                        bill.setLineMeta(item.key, { toppings: e.target.value })
                      }
                    />
                    <Input
                      className="h-9 text-xs"
                      placeholder="Extras"
                      value={item.extras || ""}
                      onChange={(e) =>
                        bill.setLineMeta(item.key, { extras: e.target.value })
                      }
                    />
                    <Input
                      className="h-9 text-xs"
                      placeholder="Special notes"
                      value={item.special_instructions || ""}
                      onChange={(e) =>
                        bill.setInstructions(item.key, e.target.value)
                      }
                    />
                  </div>
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
              {paymentOptions.map((m) => (
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
            {!isWalkin && (
              <div className="flex justify-between text-zinc-400">
                <span>Delivery</span>
                <span>{formatPrice(deliveryCharge, currency)}</span>
              </div>
            )}
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
          <Button
            variant="secondary"
            onClick={() => placeOrder("PENDING")}
            disabled={busy}
          >
            {bill.editingOrderId ? "Update Pending" : "Save Pending"}
          </Button>
          <Button variant="outline" onClick={reprint}>
            <Printer className="h-4 w-4" /> Reprint
          </Button>
          <Button variant="danger" onClick={cancelBill} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={() => placeOrder("COMPLETED")}
            disabled={busy}
          >
            Complete
          </Button>
        </div>
      </aside>

      <DealFlavorDialog
        open={Boolean(dealProduct)}
        product={dealProduct}
        products={productsWithCategories}
        categories={categories}
        onOpenChange={(open) => {
          if (!open) setDealProduct(null);
        }}
        onConfirm={onDealConfirm}
      />
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
  const sizes = product.sizes || [];
  const prices = sizes.map((s) => s.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const multiSize = sizes.length > 1;

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
            loading="lazy"
            quality={70}
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
        {multiSize ? (
          <>
            <p className="mt-1 text-sm font-semibold text-orange-400">
              {formatPrice(minPrice, currency)}
              {maxPrice !== minPrice
                ? ` – ${formatPrice(maxPrice, currency)}`
                : ""}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {sizes.map((s) => (
                <div
                  key={s.id}
                  className="rounded bg-zinc-900 px-1.5 py-1 text-center"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    {s.size}
                  </p>
                  <p className="text-xs font-semibold text-zinc-200">
                    {formatPrice(s.price, currency)}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm font-semibold text-orange-400">
            {formatPrice(minPrice, currency)}
          </p>
        )}
      </div>
    </button>
  );
}

const MemoProductTile = memo(ProductTile);
