"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  flavorsForSlot,
  isDealProduct,
  parseDealPizzaSlots,
  type DealPizzaSlot,
} from "@/lib/deal-flavors";
import { getProducts } from "@/services/api";
import type { Product } from "@/types";

export type DealFlavorState = {
  /** Human-readable note, e.g. "Regular pizza flavor 1 (M): Chicken Tikka". */
  note: string;
  /** True when every pizza slot has a flavour selected. */
  complete: boolean;
  /** True when this product is a deal that requires flavour selection. */
  hasSlots: boolean;
};

/**
 * Renders one flavour picker per pizza included in a deal, filtered to Regular
 * Pizza flavours whose size matches the slot. Reports selection state upward so
 * the parent can gate "Add to Cart" and attach the flavour note.
 *
 * Shared by the product modal and the product detail page so both enforce the
 * same size-aware flavour rules.
 */
export function DealFlavorSelector({
  product,
  onChange,
}: {
  product: Product;
  onChange: (state: DealFlavorState) => void;
}) {
  const dealSlots = useMemo<DealPizzaSlot[]>(
    () =>
      isDealProduct(product)
        ? parseDealPizzaSlots(product.description || "")
        : [],
    [product],
  );

  const [menuProducts, setMenuProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [picks, setPicks] = useState<Record<string, string>>({});

  useEffect(() => {
    setPicks({});
  }, [product]);

  useEffect(() => {
    if (!dealSlots.length) return;
    let cancelled = false;
    setLoading(true);
    getProducts()
      .then((data) => {
        if (!cancelled) setMenuProducts(data);
      })
      .catch(() => {
        if (!cancelled) setMenuProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dealSlots.length]);

  useEffect(() => {
    const note = dealSlots
      .map((slot) => {
        const flavor = menuProducts.find((p) => p.id === picks[slot.id]);
        return flavor ? `${slot.label}: ${flavor.name}` : null;
      })
      .filter(Boolean)
      .join("; ");
    const complete =
      dealSlots.length === 0 || dealSlots.every((slot) => picks[slot.id]);
    onChange({ note, complete, hasSlots: dealSlots.length > 0 });
  }, [dealSlots, picks, menuProducts, onChange]);

  if (!dealSlots.length) return null;

  return (
    <div className="space-y-3 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
      <Label className="block text-orange-300">
        Choose Regular Pizza flavors (size matches deal)
      </Label>
      {dealSlots.map((slot) => {
        const options = flavorsForSlot(menuProducts, slot);
        return (
          <div key={slot.id} className="space-y-1.5">
            <Label className="text-xs text-zinc-400">{slot.label}</Label>
            <Select
              value={picks[slot.id] || ""}
              onValueChange={(id) =>
                setPicks((prev) => ({ ...prev, [slot.id]: id }))
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loading
                      ? "Loading flavors..."
                      : options.length
                        ? `Select ${slot.size} flavor`
                        : `No ${slot.size} flavors available`
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
      })}
    </div>
  );
}
