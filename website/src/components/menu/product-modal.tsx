"use client";

import Image from "next/image";
import { useState } from "react";
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
import { cn, formatPrice } from "@/lib/utils";
import type { Product, ProductSize } from "@/types";

interface ProductModalProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

  const handleAdd = () => {
    if (!selectedSize) return;
    addItem(product, selectedSize, quantity, instructions || undefined);
    toast.success(`${product.name} (${selectedSize.size}) added to cart`);
    onOpenChange(false);
    setQuantity(1);
    setInstructions("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <div className="relative aspect-video overflow-hidden rounded-lg">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 576px"
          />
        </div>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {product.name}
          </DialogTitle>
          <DialogDescription>{product.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
