"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
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
import { isDealProduct, parseDealPizzaSlots } from "@/lib/deal-flavors";
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

export function ProductModal({
  product,
  open,
  onOpenChange,
}: ProductModalProps) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<ProductSize>(
    product.sizes[0],
  );
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [dealFlavors, setDealFlavors] = useState<DealFlavorState>(() =>
    initialDealFlavorState(product),
  );

  const handleFlavorChange = useCallback(
    (state: DealFlavorState) => setDealFlavors(state),
    [],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedSize(product.sizes[0]);
    setQuantity(1);
    setInstructions("");
    setDealFlavors(initialDealFlavorState(product));
  }, [open, product]);

  const handleAdd = () => {
    if (!selectedSize) return;

    if (dealFlavors.hasSlots && !dealFlavors.complete) {
      toast.error("Please select a flavor for each pizza in this deal");
      return;
    }

    const combinedInstructions = [dealFlavors.note, instructions.trim()]
      .filter(Boolean)
      .join(" | ");

    addItem(
      product,
      selectedSize,
      quantity,
      combinedInstructions || undefined,
    );
    toast.success(`${product.name} (${selectedSize.size}) added to cart`);
    onOpenChange(false);
    setQuantity(1);
    setInstructions("");
  };

  const showFlavorsFirst = dealFlavors.hasSlots;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92dvh] gap-3 overflow-y-auto sm:max-h-[90vh] sm:max-w-xl sm:gap-4"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Flavor pickers first for deals so the hero image never covers them. */}
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
          </div>
        )}

        {/* Compact image so size controls never sit on top of the photo (esp. laptop). */}
        <div className="relative z-0 h-32 w-full shrink-0 overflow-hidden rounded-lg bg-zinc-900 sm:h-40">
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

          {!showFlavorsFirst && (
            <DealFlavorSelector
              product={product}
              onChange={handleFlavorChange}
            />
          )}

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
              <span className="w-8 text-center font-semibold">{quantity}</span>
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
          <Button className="min-h-12 w-full" size="lg" onClick={handleAdd}>
            Add to Cart ·{" "}
            {formatPrice((selectedSize?.price ?? 0) * quantity)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
