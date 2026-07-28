"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/menu/product-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getCategories, getProducts } from "@/services/api";
import type { Category, Product } from "@/types";

export default function MenuPage() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "all";

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [search, setSearch] = useState("");
  const [sizeFilter, setSizeFilter] = useState<"all" | "pizza" | "other">("all");
  const [loading, setLoading] = useState(true);

  const pizzaCategoryIds = useMemo(
    () =>
      new Set(
        categories
          .filter((c) => c.name.toLowerCase().includes("pizza"))
          .map((c) => c.id),
      ),
    [categories],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getCategories(), getProducts()])
      .then(([cats, items]) => {
        if (!active) return;
        setCategories(cats);
        setProducts(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let result = products;
    if (categoryId !== "all") {
      result = result.filter((p) => p.category_id === categoryId);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    if (sizeFilter === "pizza") {
      result = result.filter((p) => pizzaCategoryIds.has(p.category_id));
    } else if (sizeFilter === "other") {
      result = result.filter((p) => !pizzaCategoryIds.has(p.category_id));
    }
    return result;
  }, [products, categoryId, search, sizeFilter, pizzaCategoryIds]);

  const categoryButtons = (
    <>
      <button
        type="button"
        onClick={() => setCategoryId("all")}
        className={cn(
          "shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition-colors lg:block lg:w-full lg:rounded-md lg:px-3 lg:py-2 lg:text-left",
          categoryId === "all"
            ? "bg-orange-500 text-black lg:bg-orange-500/15 lg:text-orange-400"
            : "bg-zinc-900 text-zinc-300 lg:bg-transparent lg:text-zinc-400 lg:hover:bg-zinc-900 lg:hover:text-white",
        )}
      >
        All Items
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => setCategoryId(cat.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition-colors lg:block lg:w-full lg:rounded-md lg:px-3 lg:py-2 lg:text-left",
            categoryId === cat.id
              ? "bg-orange-500 text-black lg:bg-orange-500/15 lg:text-orange-400"
              : "bg-zinc-900 text-zinc-300 lg:bg-transparent lg:text-zinc-400 lg:hover:bg-zinc-900 lg:hover:text-white",
          )}
        >
          {cat.name}
        </button>
      ))}
    </>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-5 sm:mb-8">
        <h1 className="font-display text-4xl text-white sm:text-5xl">Menu</h1>
        <p className="mt-2 hidden text-zinc-400 sm:block">
          Official Krunchies Pizza menu — shakes, pasta, rolls, burgers, pizzas,
          and family deals.
        </p>
      </div>

      <div className="sticky top-14 z-30 -mx-4 mb-4 border-b border-zinc-900 bg-black/95 px-4 py-3 backdrop-blur-sm sm:top-16 lg:hidden">
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryButtons}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden h-fit space-y-2 lg:sticky lg:top-24 lg:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-orange-500">
            Categories
          </p>
          {categoryButtons}
        </aside>

        <div>
          <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row">
            <Input
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-11 sm:max-w-xs"
            />
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(
                [
                  ["all", "All"],
                  ["pizza", "Pizzas"],
                  ["other", "Other"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSizeFilter(value)}
                  className={cn(
                    "min-h-11 shrink-0 rounded-md border px-3 py-2 text-sm",
                    sizeFilter === value
                      ? "border-orange-500 text-orange-400"
                      : "border-zinc-700 text-zinc-400",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading && products.length === 0 ? (
            <div className="grid gap-3 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/70 sm:h-72"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-zinc-500">No products found.</p>
          ) : (
            <div className="grid gap-3 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
