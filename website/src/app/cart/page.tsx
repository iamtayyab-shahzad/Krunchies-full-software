"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/context/cart-context";
import { useSettings } from "@/hooks/use-settings";
import { getProducts } from "@/services/api";
import { cn, formatPrice } from "@/lib/utils";
import { weekendPromoLabel } from "@/lib/weekend-promo";
import type { Product, ProductSize } from "@/types";
import { AfterHoursNotice } from "@/components/checkout/after-hours-notice";

function scrollToCartLine(lineId: string) {
  window.setTimeout(() => {
    const el = document.querySelector(
      `[data-cart-line="${CSS.escape(lineId)}"]`,
    );
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-orange-500");
      window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-orange-500");
      }, 1200);
    }
  }, 60);
}

export default function CartPage() {
  const {
    items,
    subtotal,
    discount,
    payable,
    changeSize,
    updateQuantity,
    removeItem,
  } = useCart();
  const { settings } = useSettings();
  const currency = settings?.currency ?? "Rs";
  const codFee = settings?.cash_on_delivery_fee ?? 50;
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let active = true;
    getProducts()
      .then((rows) => {
        if (active) setProducts(rows);
      })
      .catch(() => {
        /* catalog optional for size buttons */
      });
    return () => {
      active = false;
    };
  }, []);

  const sizesByProduct = useMemo(() => {
    const map = new Map<string, ProductSize[]>();
    for (const p of products) {
      if (p.sizes?.length) map.set(p.id, p.sizes);
    }
    return map;
  }, [products]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-5xl text-white">Your Cart</h1>
        <p className="mt-4 text-zinc-400">Your cart is empty.</p>
        <Button asChild className="mt-8">
          <Link href="/menu">Browse Menu</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="font-display text-3xl text-white sm:text-4xl">Your Cart</h1>
      <AfterHoursNotice className="mt-3" />
      <div className="mt-5 grid gap-6 pb-28 lg:mt-6 lg:grid-cols-[1fr_320px] lg:gap-8 lg:pb-0">
        <div className="space-y-2.5">
          {items.map((item) => {
            const sizes = sizesByProduct.get(item.product_id) || [];
            return (
              <div
                key={item.id}
                data-cart-line={item.id}
                className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 transition-shadow sm:gap-3 sm:p-3"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-900 sm:h-[4.5rem] sm:w-[4.5rem]">
                  <Image
                    src={item.product_image}
                    alt={item.product_name}
                    fill
                    className="object-cover"
                    sizes="72px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-white sm:text-base">
                        {item.product_name}
                      </h2>
                      <p className="text-xs text-zinc-400 sm:text-sm">
                        {item.size} · {formatPrice(item.price, currency)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center text-zinc-500 hover:text-red-400"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {sizes.length > 1 ? (
                      <div className="flex flex-wrap gap-1">
                        {sizes.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              const targetId = changeSize(item.id, s);
                              if (targetId && targetId !== item.id) {
                                toast.success(
                                  `Added ${item.product_name} (${s.size})`,
                                );
                                scrollToCartLine(targetId);
                              } else if (targetId) {
                                scrollToCartLine(targetId);
                              }
                            }}
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-bold sm:text-xs",
                              item.size_id === s.id
                                ? "bg-orange-500 text-black"
                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700",
                            )}
                          >
                            {s.size}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="ml-auto flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                      >
                        −
                      </Button>
                      <span className="w-5 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                      >
                        +
                      </Button>
                      <span className="min-w-[4.5rem] text-right text-sm font-semibold text-orange-400">
                        {formatPrice(item.price * item.quantity, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="h-fit rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-semibold text-white sm:text-lg">
            Order Summary
          </h2>
          <div className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between text-emerald-400">
                <span>{weekendPromoLabel(items) || "Promo discount"}</span>
                <span>-{formatPrice(discount, currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-zinc-400">
              <span>Delivery</span>
              <span className="text-zinc-500">At checkout</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>COD fee</span>
              <span className="text-zinc-500">
                +{formatPrice(codFee, currency)} if COD
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold text-white">
              <span>Total</span>
              <span className="text-orange-400">
                {formatPrice(payable, currency)}+
              </span>
            </div>
          </div>
          <div className="mt-4 hidden space-y-2 lg:block">
            <Button asChild className="w-full" size="lg">
              <Link href="/checkout">Checkout</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/checkout/guest">Guest Checkout</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/menu">Continue Shopping</Link>
            </Button>
          </div>
        </aside>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-black/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-sm lg:hidden">
          <Button asChild className="min-h-11 w-full" size="lg">
            <Link href="/checkout">
              Checkout · {formatPrice(payable, currency)}+
            </Link>
          </Button>
          <Button asChild variant="outline" className="mt-2 min-h-10 w-full">
            <Link href="/checkout/guest">Guest Checkout</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
