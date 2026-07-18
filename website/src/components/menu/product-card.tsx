"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductModal } from "@/components/menu/product-modal";
import { useCart } from "@/context/cart-context";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  currency?: string;
}

export function ProductCard({ product, currency = "Rs" }: ProductCardProps) {
  const { addItem } = useCart();
  const [open, setOpen] = useState(false);
  const startingPrice = Math.min(...product.sizes.map((s) => s.price));

  const quickAdd = () => {
    const size = product.sizes[0];
    if (!size) return;
    addItem(product, size, 1);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <>
      <article className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition-colors hover:border-orange-500/40">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative block aspect-[4/3] w-full overflow-hidden"
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          {product.featured && (
            <Badge className="absolute left-3 top-3">Featured</Badge>
          )}
        </button>
        <div className="space-y-3 p-4">
          <div>
            <h3 className="font-display text-xl text-white">{product.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
              {product.description}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-orange-400">
              From {formatPrice(startingPrice, currency)}
            </p>
            <div className="flex gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/menu/${product.id}`}>Details</Link>
              </Button>
              <Button size="sm" onClick={quickAdd}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </article>
      <ProductModal product={product} open={open} onOpenChange={setOpen} />
    </>
  );
}
