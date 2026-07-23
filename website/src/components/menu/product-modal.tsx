"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/context/cart-context";
import {
  flavorsForSlot,
  isDealProduct,
  parseDealPizzaSlots,
  type DealPizzaSlot,
} from "@/lib/deal-flavors";
import { cn, formatPrice } from "@/lib/utils";
import { getProducts } from "@/services/api";
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
  const [menuProducts, setMenuProducts] = useState<Product[]>([]);
  const [flavorPicks, setFlavorPicks] = useState<Record<string, string>>({});

  const dealSlots = useMemo(
    () =>
      isDealProduct(product)
        ? parseDealPizzaSlots(product.description || "")
        : [],
    [product],
  );

  useEffect(() => {
    if (!open || !dealSlots.length) return;
    getProducts()
      .then(setMenuProducts)
      .catch(() => setMenuProducts([]));
  }, [open, dealSlots.length]);

  useEffect(() => {
    if (!open) return;
    setSelectedSize(product.sizes[0]);
    setQuantity(1);
    setInstructions("");
    setFlavorPicks({});
  }, [open, product]);

  const handleAdd = () => {
    if (!selectedSize) return;

    if (dealSlots.length) {
      const missing = dealSlots.filter((slot) => !flavorPicks[slot.id]);
      if (missing.length) {
        toast.error("Please select a flavor for each pizza in this deal");
        return;
      }
    }

    const flavorNote = dealSlots
      .map((slot) => {
        const flavorId = flavorPicks[slot.id];
        const flavor = menuProducts.find((p) => p.id === flavorId);
        return flavor
          ? `${slot.label}: ${flavor.name}`
          : null;
      })
      .filter(Boolean)
      .join("; ");

    const combinedInstructions = [flavorNote, instructions.trim()]
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
    setFlavorPicks({});
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
          {dealSlots.length > 0 && (
            <div className="space-y-3 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
              <Label className="block text-orange-300">
                Choose Regular Pizza flavors (size matches deal)
              </Label>
              {dealSlots.map((slot) => (
                <FlavorPicker
                  key={slot.id}
                  slot={slot}
                  products={menuProducts}
                  value={flavorPicks[slot.id] || ""}
                  onChange={(productId) =>
                    setFlavorPicks((prev) => ({
                      ...prev,
                      [slot.id]: productId,
                    }))
                  }
                />
              ))}
            </div>
          )}

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

function FlavorPicker({
  slot,
  products,
  value,
  onChange,
}: {
  slot: DealPizzaSlot;
  products: Product[];
  value: string;
  onChange: (productId: string) => void;
}) {
  const options = flavorsForSlot(products, slot);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-400">{slot.label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue
            placeholder={
              options.length
                ? `Select ${slot.size} flavor`
                : "Loading flavors..."
            }
          />
        </SelectTrigger>
        <SelectContent>
          {options.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
