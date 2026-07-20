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
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    getProducts({
      categoryId: categoryId === "all" ? undefined : categoryId,
      search: search || undefined,
    })
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [categoryId, search]);

  const filtered = useMemo(() => {
    if (sizeFilter === "all") return products;
    if (sizeFilter === "pizza") {
      return products.filter((p) => pizzaCategoryIds.has(p.category_id));
    }
    return products.filter((p) => !pizzaCategoryIds.has(p.category_id));
  }, [products, sizeFilter, pizzaCategoryIds]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-5xl text-white">Menu</h1>
        <p className="mt-2 text-zinc-400">
          Official Krunchies Pizza menu — shakes, pasta, rolls, burgers, pizzas,
          and family deals.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit space-y-2 lg:sticky lg:top-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-orange-500">
            Categories
          </p>
          <button
            type="button"
            onClick={() => setCategoryId("all")}
            className={cn(
              "block w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
              categoryId === "all"
                ? "bg-orange-500/15 text-orange-400"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-white",
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
                "block w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                categoryId === cat.id
                  ? "bg-orange-500/15 text-orange-400"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white",
              )}
            >
              {cat.name}
            </button>
          ))}
        </aside>

        <div>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <div className="flex gap-2">
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
                    "rounded-md border px-3 py-2 text-sm",
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

          {loading ? (
            <p className="text-zinc-500">Loading menu...</p>
          ) : filtered.length === 0 ? (
            <p className="text-zinc-500">No products found.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
