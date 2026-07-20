"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Database,
  ClipboardList,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils";
import type { InventoryItem } from "@/lib/mock-data";
import {
  inventoryApi,
  inventoryTransactionsApi,
  productsApi,
  recipesApi,
} from "@/services/api";

type RecipeCard = {
  productName: string;
  ingredients: { itemName: string; quantity: number; unit: string }[];
};

type StockHistoryRow = {
  id: string;
  itemName: string;
  change: number;
  reason: string;
  createdAt: string;
};

const emptyItemForm = (): {
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  purchasePrice: number;
  supplier: string;
} => ({
  name: "",
  category: "",
  unit: "g",
  currentStock: 0,
  minimumStock: 0,
  purchasePrice: 0,
  supplier: "",
});

export default function InventoryPage() {
  const [tab, setTab] = useState<"items" | "recipes" | "history">("items");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState("");

  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm());

  const [recipeCards, setRecipeCards] = useState<RecipeCard[]>([]);
  const [historyRows, setHistoryRows] = useState<StockHistoryRow[]>([]);

  const refreshItems = async () => {
    const inv = await inventoryApi.list();
    setItems(inv);
  };

  const refreshRecipes = async () => {
    const [recipes, products] = await Promise.all([
      recipesApi.list(),
      productsApi.list(),
    ]);

    const productNameById = new Map(products.map((p) => [p.id, p.name]));
    const inventoryById = new Map(items.map((i) => [i.id, i]));

    const grouped = new Map<
      string,
      { productName: string; ingredients: RecipeCard["ingredients"] }
    >();

    for (const r of recipes) {
      const productId = r.product_id;
      const invId = r.inventory_id;
      const inv = inventoryById.get(invId);
      if (!inv) continue;
      const entry = grouped.get(productId) || {
        productName: productNameById.get(productId) || productId,
        ingredients: [],
      };
      entry.ingredients.push({
        itemName: inv.name,
        quantity: r.quantity_required,
        unit: inv.unit,
      });
      grouped.set(productId, entry);
    }

    const cards: RecipeCard[] = Array.from(grouped.entries()).map(
      ([_, v]) => v,
    );
    setRecipeCards(cards);
  };

  const refreshHistory = async () => {
    const rows = await inventoryTransactionsApi.list();
    setHistoryRows(
      rows.map((r) => ({
        id: r.id,
        itemName: r.inventory?.name || r.inventory_id,
        change: r.quantity,
        reason: r.reason,
        createdAt: r.created_at,
      })),
    );
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        await refreshItems();
        if (cancelled) return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load inventory");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "recipes") {
      refreshRecipes().catch((e) =>
        toast.error(e instanceof Error ? e.message : "Failed to load recipes"),
      );
    }
    if (tab === "history") {
      refreshHistory().catch((e) =>
        toast.error(e instanceof Error ? e.message : "Failed to load history"),
      );
    }
  }, [tab, items]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  const openCreate = () => {
    setEditing(null);
    setItemForm(emptyItemForm());
    setOpenItemDialog(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setItemForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      purchasePrice: item.purchasePrice,
      supplier: item.supplier,
    });
    setOpenItemDialog(true);
  };

  const saveItem = async () => {
    if (!itemForm.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    try {
      if (editing) {
        await inventoryApi.update(editing.id, {
          name: itemForm.name,
          category: itemForm.category,
          unit: itemForm.unit,
          currentStock: Number(itemForm.currentStock || 0),
          minimumStock: Number(itemForm.minimumStock || 0),
          purchasePrice: Number(itemForm.purchasePrice || 0),
          supplier: itemForm.supplier,
        });
        toast.success("Inventory item updated");
      } else {
        await inventoryApi.create({
          name: itemForm.name,
          category: itemForm.category,
          unit: itemForm.unit,
          currentStock: Number(itemForm.currentStock || 0),
          minimumStock: Number(itemForm.minimumStock || 0),
          purchasePrice: Number(itemForm.purchasePrice || 0),
          supplier: itemForm.supplier,
        });
        toast.success("Inventory item created");
      }

      setOpenItemDialog(false);
      await refreshItems();
      if (tab === "recipes") await refreshRecipes();
      if (tab === "history") await refreshHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const deleteItem = async (id: string) => {
    try {
      if (!confirm("Delete this inventory item?")) return;
      await inventoryApi.remove(id);
      toast.success("Inventory item deleted");
      await refreshItems();
      if (tab === "recipes") await refreshRecipes();
      if (tab === "history") await refreshHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels, suppliers, recipes, and history"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["items", "Inventory Items", Database],
            ["recipes", "Recipes", ClipboardList],
            ["history", "Stock History", Clock],
          ] as const
        ).map(([key, label]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${
                active
                  ? "bg-orange-500 text-black"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {label}
            </button>
          );
        })}

        <div className="ml-auto">
          {tab === "items" ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          ) : null}
        </div>
      </div>

      {tab === "items" ? (
        <>
          <div className="mb-4 flex items-center gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                className="pl-10"
                placeholder="Search inventory by name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center text-zinc-400">
              Loading inventory...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-zinc-950 text-sm uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Current Stock</th>
                    <th className="px-4 py-3">Purchase Price</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Minimum Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const low = item.currentStock <= item.minimumStock;
                    return (
                      <tr
                        key={item.id}
                        className="border-t border-zinc-800 align-top"
                      >
                        <td className="px-4 py-3 font-bold">{item.name}</td>
                        <td className="px-4 py-3 text-zinc-300">
                          {item.category || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-orange-400">
                          {formatPrice(item.purchasePrice)}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {item.supplier || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {item.minimumStock} {item.unit}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={low ? "warning" : "success"}>
                            {low ? "Low stock" : "OK"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => deleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!filteredItems.length ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                        No inventory items found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      {tab === "recipes" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {recipeCards.length ? (
            recipeCards.map((recipe) => (
              <Card key={recipe.productName}>
                <h3 className="text-lg font-black">{recipe.productName}</h3>
                <ul className="mt-3 space-y-2">
                  {recipe.ingredients.map((ing) => (
                    <li
                      key={`${recipe.productName}__${ing.itemName}`}
                      className="flex justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm"
                    >
                      <span>{ing.itemName}</span>
                      <span className="font-bold text-orange-400">
                        {ing.quantity} {ing.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500">
              No recipes configured.
            </div>
          )}
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="space-y-3">
          {historyRows.length ? (
            historyRows.map((row) => (
              <Card key={row.id} className="!p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{row.itemName}</p>
                    <p className="text-sm text-zinc-400">{row.reason}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-xl font-black ${
                        row.change >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {row.change > 0 ? `+${row.change}` : row.change}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(row.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500">
              No stock history found.
            </div>
          )}
        </div>
      ) : null}

      <Dialog open={openItemDialog} onOpenChange={setOpenItemDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Inventory Item" : "Add Inventory Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={itemForm.category}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="e.g. Dairy, Meat, Bakery"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                value={itemForm.unit}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, unit: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Current Stock</Label>
              <Input
                type="number"
                value={itemForm.currentStock}
                onChange={(e) =>
                  setItemForm((f) => ({
                    ...f,
                    currentStock: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum Stock</Label>
              <Input
                type="number"
                value={itemForm.minimumStock}
                onChange={(e) =>
                  setItemForm((f) => ({
                    ...f,
                    minimumStock: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Price</Label>
              <Input
                type="number"
                value={itemForm.purchasePrice}
                onChange={(e) =>
                  setItemForm((f) => ({
                    ...f,
                    purchasePrice: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input
                value={itemForm.supplier}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, supplier: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setOpenItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveItem}>{editing ? "Save" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
