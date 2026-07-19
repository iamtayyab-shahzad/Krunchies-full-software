"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatPrice } from "@/lib/utils";
import {
  inventoryApi,
  productsApi,
  recipesApi,
} from "@/services/api";
import type { InventoryItem, Recipe } from "@/types";

export default function InventoryPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"stock" | "recipes" | "history">("stock");
  const [open, setOpen] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({
    name: "",
    unit: "g",
    stock: 0,
    purchase_price: 0,
    minimum_stock: 0,
  });
  const [recipeForm, setRecipeForm] = useState({
    product_id: "",
    inventory_id: "",
    quantity_required: 1,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: inventoryApi.list,
  });
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: recipesApi.list,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
  });

  const history = useMemo(() => {
    return inventory
      .flatMap((i) =>
        (i.inventory_transactions || []).map((t) => ({
          ...t,
          item_name: i.name,
        })),
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [inventory]);

  const saveItem = async () => {
    try {
      if (editing) {
        await inventoryApi.update(editing.id, form);
        toast.success("Inventory updated");
      } else {
        await inventoryApi.create(form);
        toast.success("Inventory created");
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["inventory"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const saveRecipe = async () => {
    try {
      await recipesApi.create({
        product_id: recipeForm.product_id,
        inventory_id: recipeForm.inventory_id,
        quantity_required: Number(recipeForm.quantity_required),
      });
      toast.success("Recipe added");
      setRecipeOpen(false);
      qc.invalidateQueries({ queryKey: ["recipes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Inventory</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setRecipeForm({
                product_id: "",
                inventory_id: "",
                quantity_required: 1,
              });
              setRecipeOpen(true);
            }}
          >
            Add Recipe
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setForm({
                name: "",
                unit: "g",
                stock: 0,
                purchase_price: 0,
                minimum_stock: 0,
              });
              setOpen(true);
            }}
          >
            Add Item
          </Button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {(
          [
            ["stock", "Stock List"],
            ["recipes", "Recipes"],
            ["history", "History"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-bold",
              tab === id ? "bg-orange-500 text-black" : "bg-zinc-900 text-zinc-400",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "stock" && (
        <div className="space-y-3">
          {inventory.map((item) => {
            const low = item.stock <= item.minimum_stock;
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border bg-zinc-950 p-4",
                  low ? "border-red-500/50" : "border-zinc-800",
                )}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-bold">
                      {item.name}{" "}
                      {low && (
                        <span className="text-sm text-red-400">LOW STOCK</span>
                      )}
                    </p>
                    <p className="text-sm text-zinc-400">
                      Stock: {item.stock} {item.unit} · Min: {item.minimum_stock}{" "}
                      · Cost: {formatPrice(item.purchase_price)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditing(item);
                        setForm({
                          name: item.name,
                          unit: item.unit,
                          stock: item.stock,
                          purchase_price: item.purchase_price,
                          minimum_stock: item.minimum_stock,
                        });
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={async () => {
                        if (!confirm("Delete item?")) return;
                        await inventoryApi.remove(item.id);
                        qc.invalidateQueries({ queryKey: ["inventory"] });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "recipes" && (
        <div className="space-y-3">
          {recipes.map((r: Recipe) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4"
            >
              <div>
                <p className="font-bold">
                  {r.product?.name || r.product_id.slice(0, 8)}
                </p>
                <p className="text-sm text-zinc-400">
                  Uses {r.quantity_required} of{" "}
                  {r.inventory?.name || r.inventory_id.slice(0, 8)}
                </p>
              </div>
              <Button
                variant="danger"
                onClick={async () => {
                  await recipesApi.remove(r.id);
                  qc.invalidateQueries({ queryKey: ["recipes"] });
                }}
              >
                Delete
              </Button>
            </div>
          ))}
          {!recipes.length && (
            <p className="text-zinc-500">No recipes configured.</p>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-2">
          {history.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm"
            >
              <p className="font-semibold text-white">
                {t.item_name} · {t.transaction_type} · {t.quantity}
              </p>
              <p className="text-zinc-500">
                {t.reason} · {new Date(t.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          {!history.length && (
            <p className="text-zinc-500">
              No transaction history loaded. Complete orders to generate
              consumption records.
            </p>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Inventory" : "Add Inventory"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(
              [
                ["name", "Name"],
                ["unit", "Unit"],
                ["stock", "Current Stock"],
                ["purchase_price", "Purchase Price"],
                ["minimum_stock", "Minimum Stock"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  type={key === "name" || key === "unit" ? "text" : "number"}
                  value={form[key]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [key]:
                        key === "name" || key === "unit"
                          ? e.target.value
                          : Number(e.target.value),
                    })
                  }
                />
              </div>
            ))}
            <Button className="w-full" onClick={saveItem}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={recipeOpen} onOpenChange={setRecipeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recipe Management</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Product</Label>
              <Select
                value={recipeForm.product_id}
                onValueChange={(v) =>
                  setRecipeForm({ ...recipeForm, product_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Inventory Item</Label>
              <Select
                value={recipeForm.inventory_id}
                onValueChange={(v) =>
                  setRecipeForm({ ...recipeForm, inventory_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select inventory" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Quantity Required</Label>
              <Input
                type="number"
                value={recipeForm.quantity_required}
                onChange={(e) =>
                  setRecipeForm({
                    ...recipeForm,
                    quantity_required: Number(e.target.value),
                  })
                }
              />
            </div>
            <Button className="w-full" onClick={saveRecipe}>
              Save Recipe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
