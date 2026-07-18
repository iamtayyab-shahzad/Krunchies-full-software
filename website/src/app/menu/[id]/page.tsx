"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/context/cart-context";
import { cn, formatPrice } from "@/lib/utils";
import { getProductById } from "@/services/api";
import type { Product, ProductSize } from "@/types";

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    getProductById(params.id)
      .then((data) => {
        setProduct(data);
        setSelectedSize(data?.sizes[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <div className="p-10 text-zinc-500">Loading product...</div>;
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl text-white">Product not found</h1>
        <Button asChild className="mt-6">
          <Link href="/menu">Back to Menu</Link>
        </Button>
      </div>
    );
  }

  const handleAdd = () => {
    if (!selectedSize) return;
    addItem(product, selectedSize, quantity, instructions || undefined);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="relative aspect-square overflow-hidden rounded-2xl">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
      <div>
        <p className="text-sm uppercase tracking-wider text-orange-500">
          {product.category?.name}
        </p>
        <h1 className="mt-2 font-display text-5xl text-white">{product.name}</h1>
        <p className="mt-4 text-zinc-400">{product.description}</p>

        <div className="mt-8">
          <Label className="mb-3 block">Choose Size</Label>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={cn(
                  "rounded-md border px-4 py-3 text-sm transition-colors",
                  selectedSize?.id === size.id
                    ? "border-orange-500 bg-orange-500/15 text-orange-300"
                    : "border-zinc-700 text-zinc-300",
                )}
              >
                {size.size} · {formatPrice(size.price)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <Label className="mb-2 block">Quantity</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </Button>
            <span className="w-8 text-center font-semibold">{quantity}</span>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setQuantity((q) => q + 1)}
            >
              +
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <Label htmlFor="notes" className="mb-2 block">
            Special Instructions
          </Label>
          <Textarea
            id="notes"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Any special requests?"
          />
        </div>

        <Button size="lg" className="mt-8 w-full sm:w-auto" onClick={handleAdd}>
          Add to Cart ·{" "}
          {formatPrice((selectedSize?.price ?? 0) * quantity)}
        </Button>
      </div>
    </div>
  );
}
