"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/menu/product-card";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/services/api";
import type { Product } from "@/types";

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getProducts({ featured: true }).then(setProducts);
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-10 flex items-end justify-between gap-4"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
            Signature Picks
          </p>
          <h2 className="mt-2 font-display text-4xl text-white sm:text-5xl">
            Featured Products
          </h2>
        </div>
        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href="/menu">View Full Menu</Link>
        </Button>
      </motion.div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.slice(0, 6).map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
