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
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Flavor pickers first for deals so the hero image never covers them. */}
        {showFlavorsFirst && (
          <div className="relative z-20 space-y-3">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                {product.name}
              </DialogTitle>
              <DialogDescription>{product.description}</DialogDescription>
            </DialogHeader>
            <DealFlavorSelector
              product={product}
              onChange={handleFlavorChange}
            />
          </div>
        )}

        <div className="relative z-0 aspect-video max-h-48 shrink-0 overflow-hidden rounded-lg sm:max-h-56">
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
            <DialogTitle className="font-display text-2xl">
              {product.name}
            </DialogTitle>
            <DialogDescription>{product.description}</DialogDescription>
          </DialogHeader>
        )}

        <div className="relative z-10 space-y-4">
          <div>
            <Label className="mb-2 block">Size</Label>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm transition-colors",
                    selectedSize?.id === size.id
                      ? "border-orange-500 bg-orange-500/15 text-orange-300"
                      : "border-zinc-700 text-zinc-300 hover:border-zinc-500",
                  )}
                >
                  {size.size} · {formatPrice(size.price)}
                </button>
              ))}
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
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </Button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <Button
                type="button"
                variant="secondary"
                size="icon"
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

          <Button className="w-full" size="lg" onClick={handleAdd}>
            Add to Cart ·{" "}
            {formatPrice((selectedSize?.price ?? 0) * quantity)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
