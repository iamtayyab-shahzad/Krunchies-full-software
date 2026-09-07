"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/i18n/locale-context";
import { formatPrice, cn } from "@/lib/utils";
import { getProducts } from "@/services/api";
import type { Product } from "@/types";

export function HeaderSearch() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    getProducts()
      .then((rows) => {
        if (active) setProducts(rows);
      })
      .catch(() => {
        if (active) setProducts([]);
      });
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      active = false;
      window.clearTimeout(id);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [products, query]);

  const goMenuSearch = () => {
    const q = query.trim();
    setOpen(false);
    router.push(q ? `/menu?q=${encodeURIComponent(q)}` : "/menu");
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11"
        aria-label={t("menu_search")}
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 px-3 pt-16 sm:pt-24">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close search"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 shrink-0 text-zinc-500" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    goMenuSearch();
                  }
                }}
                placeholder={t("menu_search")}
                className={cn(
                  "min-h-11 border-0 bg-transparent px-0 focus-visible:ring-0",
                  locale === "ur" && "font-urdu text-base",
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {query.trim() ? (
              <ul className="mt-3 max-h-[50vh] space-y-1 overflow-y-auto">
                {results.length === 0 ? (
                  <li className="px-2 py-6 text-center text-sm text-zinc-500">
                    No products found
                  </li>
                ) : (
                  results.map((p) => {
                    const price = Math.min(...p.sizes.map((s) => s.price));
                    return (
                      <li key={p.id}>
                        <Link
                          href={`/menu/${p.id}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-900"
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-900">
                            <Image
                              src={p.image}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-white">
                              {p.name}
                            </p>
                            <p className="text-sm text-orange-400">
                              {formatPrice(price)}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })
                )}
                <li>
                  <button
                    type="button"
                    onClick={goMenuSearch}
                    className="mt-1 w-full rounded-lg px-2 py-3 text-left text-sm font-semibold text-orange-400 hover:bg-zinc-900"
                  >
                    Search all menu for “{query.trim()}”
                  </button>
                </li>
              </ul>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">
                Type a product name — pizza, burger, shake…
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
