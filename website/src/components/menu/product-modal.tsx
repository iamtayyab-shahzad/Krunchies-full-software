"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/context/cart-context";
import {
  DealFlavorSelector,
  type DealFlavorState,
} from "@/components/menu/deal-flavor-selector";
import {
  DrinkFlavorSelector,
  type DrinkFlavorState,
} from "@/components/menu/drink-flavor-selector";
import { isDealProduct, parseDealPizzaSlots } from "@/lib/deal-flavors";
import { requiresDrinkFlavor } from "@/lib/drink-flavors";
import { useSettings } from "@/hooks/use-settings";
import { cn, formatPrice } from "@/lib/utils";
import type { Product, ProductSize } from "@/types";

interface ProductModalProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function initialDealFlavorState(product: Product): DealFlavorState {
  const hasSlots =
    isDealProduct(product) &&
    parseDealPizzaSlots(product.description || "").length > 0;
  return {
    note: "",
    complete: !hasSlots,
    hasSlots,
  };
}

function initialDrinkFlavorState(product: Product): DrinkFlavorState {
  const needed = requiresDrinkFlavor(product);
  return { note: "", complete: !needed, needed };
}

function emptyQtyMap(sizes: ProductSize[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of sizes) map[s.id] = 0;
  return map;
}

export function ProductModal({
  product,
  open,
  onOpenChange,
}: ProductModalProps) {
  const { addItem } = useCart();
  const { settings } = useSettings();
  const [selectedSize, setSelectedSize] = useState<ProductSize>(
    product.sizes[0],
  );
  const [quantity, setQuantity] = useState(1);
  const [qtyBySize, setQtyBySize] = useState<Record<string, number>>(() =>
    emptyQtyMap(product.sizes),
  );
  const [instructions, setInstructions] = useState("");
  const [dealFlavors, setDealFlavors] = useState<DealFlavorState>(() =>
    initialDealFlavorState(product),
  );
  const [drinkFlavors, setDrinkFlavors] = useState<DrinkFlavorState>(() =>
    initialDrinkFlavorState(product),
  );

  const handleFlavorChange = useCallback(
    (state: DealFlavorState) => setDealFlavors(state),
    [],
  );
  const handleDrinkFlavorChange = useCallback(
    (state: DrinkFlavorState) => setDrinkFlavors(state),
    [],
  );

  const showFlavorsFirst = dealFlavors.hasSlots || drinkFlavors.needed;
  /** Pizzas with S/M/L: qty per size so Small + Medium both go to cart. */
  const perSizeQty =
    (product.sizes?.length || 0) > 1 && !dealFlavors.hasSlots;

  useEffect(() => {
    if (!open) return;
    setSelectedSize(product.sizes[0]);
    setQuantity(1);
    // All sizes start at 0 — user taps + on each size they want (e.g. Small then Medium).
    setQtyBySize(emptyQtyMap(product.sizes));
    setInstructions("");
    setDealFlavors(initialDealFlavorState(product));
    setDrinkFlavors(initialDrinkFlavorState(product));
  }, [open, product]);

  const bumpSizeQty = (sizeId: string, delta: number) => {
    setQtyBySize((prev) => ({
      ...prev,
      [sizeId]: Math.max(0, (prev[sizeId] || 0) + delta),
    }));
  };

  const totalUnits = useMemo(() => {
    if (!perSizeQty) return quantity;
    return Object.values(qtyBySize).reduce((s, n) => s + n, 0);
  }, [perSizeQty, qtyBySize, quantity]);

  const totalPrice = useMemo(() => {
    if (!perSizeQty) {
      return (selectedSize?.price ?? 0) * quantity;
    }
    return product.sizes.reduce(
      (sum, s) => sum + s.price * (qtyBySize[s.id] || 0),
      0,
    );
  }, [perSizeQty, product.sizes, qtyBySize, selectedSize, quantity]);

  const handleAdd = () => {
    if (dealFlavors.hasSlots && !dealFlavors.complete) {
      toast.error("Please select a flavor for each pizza in this deal");
      return;
    }
    if (drinkFlavors.needed && !drinkFlavors.complete) {
      toast.error("Please choose a drink flavor");
      return;
    }

    const combinedInstructions = [
      dealFlavors.note,
      drinkFlavors.note,
      instructions.trim(),
    ]
      .filter(Boolean)
      .join(" | ");
    const notes = combinedInstructions || undefined;

    if (perSizeQty) {
      const lines = product.sizes.filter((s) => (qtyBySize[s.id] || 0) > 0);
      if (lines.length === 0) {
        toast.error("Set quantity for at least one size (use +)");
        return;
      }
      const parts: string[] = [];
      for (const size of lines) {
        const q = qtyBySize[size.id] || 0;
        addItem(product, size, q, notes);
        parts.push(`${q}× ${size.size}`);
      }
      toast.success(`${product.name}: ${parts.join(", ")} added`);
    } else {
      if (!selectedSize) return;
      addItem(product, selectedSize, quantity, notes);
      toast.success(`${product.name} (${selectedSize.size}) added to cart`);
    }

    onOpenChange(false);
    setQuantity(1);
    setInstructions("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92dvh] gap-3 overflow-y-auto sm:max-h-[90vh] sm:max-w-xl sm:gap-4"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {showFlavorsFirst && (
          <div className="relative z-20 space-y-3">
            <DialogHeader>
              <DialogTitle className="font-display text-xl sm:text-2xl">
                {product.name}
              </DialogTitle>
              <DialogDescription className="line-clamp-3 sm:line-clamp-none">
                {product.description}
              </DialogDescription>
            </DialogHeader>
            <DealFlavorSelector
              product={product}
              onChange={handleFlavorChange}
            />
            <DrinkFlavorSelector
              product={product}
              flavorsRaw={settings?.drink_flavors}
              onChange={handleDrinkFlavorChange}
            />
          </div>
        )}

        <div className="relative z-0 h-28 w-full shrink-0 overflow-hidden rounded-lg bg-zinc-900 sm:h-36">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 576px"
          />
        </div>

        {!showFlavorsFirst && (
          <DialogHeader>
            <DialogTitle className="font-display text-xl sm:text-2xl">
              {product.name}
            </DialogTitle>
            <DialogDescription className="line-clamp-3 sm:line-clamp-none">
              {product.description}
            </DialogDescription>
          </DialogHeader>
        )}

        <div className="relative z-10 space-y-4 bg-zinc-950 pb-2">
          {perSizeQty ? (
            <div>
              <Label className="mb-2 block">Sizes &amp; quantity</Label>
              <p className="mb-2 text-xs text-zinc-500">
                Set how many of each size — e.g. 1 Small + 1 Medium.
              </p>
              <div className="space-y-2">
                {product.sizes.map((size) => {
                  const was = Number(size.was_price || 0);
                  const save = was > size.price ? was - size.price : 0;
                  const q = qtyBySize[size.id] || 0;
                  return (
                    <div
                      key={size.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2",
                        q > 0
                          ? "border-orange-500/60 bg-orange-500/10"
                          : "border-zinc-800 bg-zinc-900/50",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          {size.size} · {formatPrice(size.price)}
                        </p>
                        {save > 0 ? (
                          <p className="text-[10px] text-emerald-400">
                            Save {formatPrice(save)}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => bumpSizeQty(size.id, -1)}
                      >
                        −
                      </Button>
                      <span className="w-6 text-center text-sm font-bold">
                        {q}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => bumpSizeQty(size.id, 1)}
                      >
                        +
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div>
                <Label className="mb-2 block">Size</Label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => {
                    const was = Number(size.was_price || 0);
                    const save = was > size.price ? was - size.price : 0;
                    return (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          "min-h-11 rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
                          selectedSize?.id === size.id
                            ? "border-orange-500 bg-orange-500 text-black"
                            : "border-zinc-600 bg-zinc-900 text-zinc-100 hover:border-orange-500/60",
                        )}
                      >
                        {size.size} · {formatPrice(size.price)}
                        {save > 0 ? (
                          <span className="ml-1 text-xs opacity-80">
                            (Save {formatPrice(save)})
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Quantity</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    −
                  </Button>
                  <span className="w-8 text-center font-semibold">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => setQuantity((q) => q + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            </>
          )}

          {!showFlavorsFirst && (
            <>
              <DealFlavorSelector
                product={product}
                onChange={handleFlavorChange}
              />
              <DrinkFlavorSelector
                product={product}
                flavorsRaw={settings?.drink_flavors}
                onChange={handleDrinkFlavorChange}
              />
            </>
          )}

          <div>
            <Label htmlFor="instructions" className="mb-2 block">
              Special Instructions
            </Label>
            <Textarea
              id="instructions"
              placeholder="Extra cheese, less spice..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
        </div>

        <div className="sticky bottom-0 z-30 -mx-5 border-t border-zinc-800 bg-zinc-950 px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-6 sm:px-6">
          <Button
            className="min-h-12 w-full"
            size="lg"
            onClick={handleAdd}
            disabled={totalUnits < 1}
          >
            Add to Cart
            {totalUnits > 0
              ? ` · ${totalUnits} item${totalUnits === 1 ? "" : "s"} · ${formatPrice(totalPrice)}`
              : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
