"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/context/cart-context";
import { useSettings } from "@/hooks/use-settings";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const {
    items,
    subtotal,
    updateQuantity,
    updateInstructions,
    removeItem,
  } = useCart();
  const { settings } = useSettings();
  const currency = settings?.currency ?? "Rs";
  const codFee = settings?.cash_on_delivery_fee ?? 50;

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
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-5xl text-white">Your Cart</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:flex-row"
            >
              <div className="relative h-28 w-full overflow-hidden rounded-lg sm:h-24 sm:w-24">
                <Image
                  src={item.product_image}
                  alt={item.product_name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-white">
                      {item.product_name}
                    </h2>
                    <p className="text-sm text-zinc-400">
                      {item.size} · {formatPrice(item.price, currency)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-zinc-500 hover:text-red-400"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
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
                  <span className="w-6 text-center text-sm font-semibold">
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
                  <span className="ml-auto text-sm font-semibold text-orange-400">
                    {formatPrice(item.price * item.quantity, currency)}
                  </span>
                </div>
                <Textarea
                  placeholder="Special instructions for this item..."
                  value={item.special_instructions ?? ""}
                  onChange={(e) =>
                    updateInstructions(item.id, e.target.value)
                  }
                  className="min-h-[72px]"
                />
              </div>
            </div>
          ))}
        </div>

        <aside className="h-fit rounded-xl border border-zinc-800 bg-zinc-950 p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-white">Order Summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Delivery Charges</span>
              <span className="text-zinc-500">Calculated at checkout</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Cash on Delivery Fee</span>
              <span className="text-zinc-500">
                +{formatPrice(codFee, currency)} if COD
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold text-white">
              <span>Grand Total</span>
              <span className="text-orange-400">
                {formatPrice(subtotal, currency)}+
              </span>
            </div>
          </div>
          <div className="mt-6 space-y-3">
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
      </div>
    </div>
  );
}
