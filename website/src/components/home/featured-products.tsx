"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/menu/product-card";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/services/api";
import type { Product } from "@/types";

function FeaturedSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/80 sm:h-72"
        />
      ))}
    </div>
  );
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getProducts({ featured: true })
      .then((rows) => {
        if (active) setProducts(rows);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
            Signature Picks
          </p>
          <h2 className="mt-2 font-display text-3xl text-white sm:text-5xl">
            Featured Products
          </h2>
        </div>
        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href="/menu">View Full Menu</Link>
        </Button>
      </div>
      {loading && products.length === 0 ? (
        <FeaturedSkeleton />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {products.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      <div className="mt-6 sm:hidden">
        <Button asChild variant="outline" className="min-h-11 w-full">
          <Link href="/menu">View Full Menu</Link>
        </Button>
      </div>
    </section>
  );
}
