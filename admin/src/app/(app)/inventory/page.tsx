"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Database,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Trash,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice, formatStock } from "@/lib/utils";
import type { InventoryItem } from "@/lib/mock-data";
import {
  inventoryApi,
  inventoryTransactionsApi,
} from "@/services/api";

type Tab = "items" | "to-buy" | "wastage" | "history";

type AlertsSummary = {
  low: number;
  out: number;
  negative: number;
  stockValue: number;
};

type Recommendation = {
  inventory_id: string;
  name: string;
  category: string;
  unit: string;
  purchase_unit: string;
  current_stock: number;
  minimum_stock: number;
  avg_daily_usage: number;
  days_remaining: number;
  suggested_qty_base: number;
  suggested_qty_purchase: number;
  estimated_cost: number;
  urgency: string;
  reason: string;
};

type TxRow = {
  id: string;
  inventoryId: string;
  itemName: string;
  unit: string;
  quantity: number;
  type: string;
  reason: string;
  createdAt: string;
  totalCost?: number;
  balanceAfter?: number;
};

const UNIT_KINDS = ["WEIGHT", "VOLUME", "COUNT"] as const;

const PURCHASE_UNITS_BY_KIND: Record<string, string[]> = {
  WEIGHT: ["KG", "g", "Packet", "Bag"],
  VOLUME: ["Litre", "ml", "Bottle", "Can"],
  COUNT: ["pcs", "Carton", "Dozen", "Packet", "Box"],
};

function baseUnitForKind(kind: string) {
  switch (kind) {
    case "VOLUME":
      return "ml";
    case "COUNT":
      return "pcs";
    default:
      return "g";
  }
}

function defaultPurchaseUnit(kind: string) {
  switch (kind) {
    case "VOLUME":
      return "Litre";
    case "COUNT":
      return "pcs";
    default:
      return "KG";
  }
}

function defaultUnitsPerPurchase(purchaseUnit: string): number {
  const pu = purchaseUnit.toLowerCase().trim();
  if (["kg", "kilogram", "kilo"].includes(pu)) return 1000;
  if (["l", "litre", "liter", "ltr"].includes(pu)) return 1000;
  if (["carton", "case"].includes(pu)) return 24;
  if (pu === "dozen") return 12;
  if (["pcs", "piece", "pieces", "g", "gram", "grams", "ml"].includes(pu)) return 1;
  return 1;
}

function stockStatus(item: InventoryItem): {
  label: string;
  tone: "success" | "warning" | "danger";
} {
  if (item.currentStock < 0) return { label: "Negative", tone: "danger" };
  if (item.currentStock === 0) return { label: "Out", tone: "danger" };
  if (item.currentStock <= item.minimumStock)
    return { label: "Low", tone: "warning" };
  return { label: "OK", tone: "success" };
}

function urgencyTone(
  urgency: string,
): "danger" | "warning" | "orange" | "default" | "success" {
  const u = urgency.toUpperCase();
  if (u === "CRITICAL") return "danger";
  if (u === "HIGH") return "warning";
  if (u === "MEDIUM") return "orange";
  if (u === "LOW") return "success";
  return "default";
}

function txTone(
  type: string,
): "success" | "warning" | "danger" | "orange" | "default" {
  const t = type.toUpperCase();
  if (t === "PURCHASE" || t === "IN" || t === "ADJUST_IN") return "success";
  if (t === "WASTAGE") return "danger";
  if (t === "SALE" || t === "OUT" || t === "USAGE") return "orange";
  if (t === "REVERSE" || t === "ADJUST") return "warning";
  return "default";
}

type ItemForm = {
  name: string;
  category: string;
  unitKind: string;
  purchaseUnit: string;
  unitsPerPurchase: number;
  currentStock: number;
  minimumStock: number;
  purchasePrice: number;
  supplier: string;
};

const emptyItemForm = (): ItemForm => ({
  name: "",
  category: "",
  unitKind: "WEIGHT",
  purchaseUnit: "KG",
  unitsPerPurchase: 1000,
  currentStock: 0,
  minimumStock: 0,
  purchasePrice: 0,
  supplier: "",
});

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("items");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [alerts, setAlerts] = useState<AlertsSummary>({
    low: 0,
    out: 0,
    negative: 0,
    stockValue: 0,
  });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [historyRows, setHistoryRows] = useState<TxRow[]>([]);
  const [wastageRows, setWastageRows] = useState<TxRow[]>([]);

  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm());

  const [wastageItemId, setWastageItemId] = useState("");
  const [wastageQty, setWastageQty] = useState(0);
  const [wastageReason, setWastageReason] = useState("");
  const [savingWastage, setSavingWastage] = useState(false);

  const knownCategories = useMemo(() => {
    const set = new Set(
      items.map((i) => i.category.trim()).filter(Boolean),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const mapTx = (
    r: Awaited<ReturnType<typeof inventoryTransactionsApi.list>>[number],
  ): TxRow => ({
    id: r.id,
    inventoryId: r.inventory_id,
    itemName: r.inventory?.name || r.inventory_id,
    unit: r.inventory?.unit || "",
    quantity: r.quantity,
    type: r.transaction_type,
    reason: r.reason,
    createdAt: r.created_at,
    totalCost: r.total_cost,
    balanceAfter: r.balance_after,
  });

  const refreshItems = async () => {
    const inv = await inventoryApi.list();
    setItems(inv);
  };

  const refreshAlerts = async () => {
    const a = await inventoryApi.alerts();
    setAlerts({
      low: a.low_stock?.length || 0,
      out: a.out_of_stock?.length || 0,
      negative: a.negative_stock?.length || 0,
      stockValue: Number(a.stock_value || 0),
    });
  };

  const refreshRecommendations = async () => {
    const rows = await inventoryApi.recommendations();
    setRecommendations(Array.isArray(rows) ? rows : []);
  };

  const refreshHistory = async () => {
    const rows = await inventoryTransactionsApi.list();
    setHistoryRows(rows.map(mapTx));
  };

  const refreshWastage = async () => {
    const rows = await inventoryTransactionsApi.list(undefined, "WASTAGE");
    setWastageRows(rows.map(mapTx));
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([refreshItems(), refreshAlerts()]);
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error ? e.message : "Failed to load inventory",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tab === "to-buy") {
      refreshRecommendations().catch((e) =>
        toast.error(
          e instanceof Error ? e.message : "Failed to load recommendations",
        ),
      );
    }
    if (tab === "wastage") {
      refreshWastage().catch((e) =>
        toast.error(e instanceof Error ? e.message : "Failed to load wastage"),
      );
    }
    if (tab === "history") {
      refreshHistory().catch((e) =>
        toast.error(e instanceof Error ? e.message : "Failed to load history"),
      );
    }
  }, [tab]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.supplier.toLowerCase().includes(q)
      );
    });
  }, [items, query, categoryFilter]);

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
      unitKind: item.unitKind || "WEIGHT",
      purchaseUnit: item.purchaseUnit || defaultPurchaseUnit(item.unitKind),
      unitsPerPurchase: item.unitsPerPurchase || 1,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      purchasePrice: item.purchasePrice,
      supplier: item.supplier,
    });
    setOpenItemDialog(true);
  };

  const setUnitKind = (kind: string) => {
    const purchaseUnit = defaultPurchaseUnit(kind);
    setItemForm((f) => ({
      ...f,
      unitKind: kind,
      purchaseUnit,
      unitsPerPurchase: defaultUnitsPerPurchase(purchaseUnit),
    }));
  };

  const setPurchaseUnit = (purchaseUnit: string) => {
    setItemForm((f) => ({
      ...f,
      purchaseUnit,
      unitsPerPurchase: defaultUnitsPerPurchase(purchaseUnit),
    }));
  };

  const saveItem = async () => {
    if (!itemForm.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    const upp = Number(itemForm.unitsPerPurchase || 0) || 1;
    const baseUnit = baseUnitForKind(itemForm.unitKind);
    const stockForSave = editing
      ? Number(itemForm.currentStock || 0)
      : Math.round(Number(itemForm.currentStock || 0) * upp);

    try {
      const payload = {
        name: itemForm.name.trim(),
        category: itemForm.category.trim(),
        unitKind: itemForm.unitKind,
        unit: baseUnit,
        purchaseUnit: itemForm.purchaseUnit,
        unitsPerPurchase: upp,
        currentStock: stockForSave,
        minimumStock: Number(itemForm.minimumStock || 0),
        purchasePrice: Number(itemForm.purchasePrice || 0),
        supplier: itemForm.supplier.trim(),
      };
      if (editing) {
        await inventoryApi.update(editing.id, payload);
        toast.success("Inventory item updated");
      } else {
        await inventoryApi.create(payload);
        toast.success("Inventory item created");
      }
      setOpenItemDialog(false);
      await Promise.all([refreshItems(), refreshAlerts()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this inventory item?")) return;
    try {
      await inventoryApi.remove(id);
      toast.success("Inventory item deleted");
      await Promise.all([refreshItems(), refreshAlerts()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const submitWastage = async () => {
    if (!wastageItemId) {
      toast.error("Select an inventory item");
      return;
    }
    if (Number(wastageQty) <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    if (!wastageReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setSavingWastage(true);
    try {
      await inventoryApi.wastage(
        wastageItemId,
        Number(wastageQty),
        wastageReason.trim(),
      );
      toast.success("Wastage recorded");
      setWastageQty(0);
      setWastageReason("");
      await Promise.all([
        refreshItems(),
        refreshAlerts(),
        refreshWastage(),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record wastage");
    } finally {
      setSavingWastage(false);
    }
  };

  const selectedWastageItem = items.find((i) => i.id === wastageItemId);
  const purchaseUnitOptions =
    PURCHASE_UNITS_BY_KIND[itemForm.unitKind] || PURCHASE_UNITS_BY_KIND.WEIGHT;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels, to-buy list, wastage, and history"
      />

      {(alerts.low > 0 || alerts.out > 0 || alerts.negative > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-sm font-semibold text-amber-200">
            Stock alerts:
            {alerts.low > 0 ? (
              <span className="ml-2 text-amber-400">{alerts.low} low</span>
            ) : null}
            {alerts.out > 0 ? (
              <span className="ml-2 text-red-400">{alerts.out} out</span>
            ) : null}
            {alerts.negative > 0 ? (
              <span className="ml-2 text-red-300">
                {alerts.negative} negative
              </span>
            ) : null}
            <span className="ml-3 text-zinc-400">
              Value {formatPrice(alerts.stockValue)}
            </span>
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["items", "Inventory Items", Database],
            ["to-buy", "To Buy", ShoppingCart],
            ["wastage", "Wastage", Trash],
            ["history", "Stock History", Clock],
          ] as const
        ).map(([key, label, Icon]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${
                active
                  ? "bg-orange-500 text-black"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <Icon className="h-4 w-4" />
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
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                className="pl-10"
                placeholder="Search by name, category, supplier..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {knownCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Min</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const status = stockStatus(item);
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
                          {formatStock(
                            item.currentStock,
                            item.unit,
                            item.purchaseUnit,
                            item.unitsPerPurchase,
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {formatStock(
                            item.minimumStock,
                            item.unit,
                            item.purchaseUnit,
                            item.unitsPerPurchase,
                          )}
                        </td>
                        <td className="px-4 py-3 text-orange-400">
                          {formatPrice(item.stockValue)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={status.tone}>{status.label}</Badge>
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
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-zinc-500"
                      >
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

      {tab === "to-buy" ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-zinc-950 text-sm uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Urgency</th>
                <th className="px-4 py-3">Current</th>
                <th className="px-4 py-3">Suggested Qty</th>
                <th className="px-4 py-3">Est. Cost</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((r) => (
                <tr key={r.inventory_id} className="border-t border-zinc-800">
                  <td className="px-4 py-3">
                    <p className="font-bold">{r.name}</p>
                    <p className="text-sm text-zinc-500">
                      {r.category || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={urgencyTone(r.urgency)}>{r.urgency}</Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {formatStock(
                      r.current_stock,
                      r.unit,
                      r.purchase_unit,
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-orange-400">
                    {Number(r.suggested_qty_purchase || 0).toLocaleString(
                      "en-PK",
                      { maximumFractionDigits: 2 },
                    )}{" "}
                    {r.purchase_unit || r.unit}
                  </td>
                  <td className="px-4 py-3 text-orange-400">
                    {formatPrice(r.estimated_cost)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {r.reason}
                    {r.days_remaining >= 0 ? (
                      <span className="mt-1 block text-xs text-zinc-500">
                        ~{Number(r.days_remaining).toFixed(1)} days remaining
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!recommendations.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    Nothing to buy right now — stock looks healthy.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "wastage" ? (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <Card>
            <h2 className="mb-4 text-lg font-bold">Record Wastage</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Item</Label>
                <Select
                  value={wastageItemId || undefined}
                  onValueChange={setWastageItemId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Quantity
                  {selectedWastageItem
                    ? ` (${selectedWastageItem.unit} base)`
                    : " (base unit)"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={wastageQty}
                  onChange={(e) => setWastageQty(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={wastageReason}
                  onChange={(e) => setWastageReason(e.target.value)}
                  placeholder="Spoiled, spilled, expired..."
                />
              </div>
              <Button
                className="w-full"
                disabled={savingWastage}
                onClick={submitWastage}
              >
                {savingWastage ? "Saving..." : "Record Wastage"}
              </Button>
            </div>
          </Card>

          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-zinc-950 text-sm uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody>
                {wastageRows.map((row) => (
                  <tr key={row.id} className="border-t border-zinc-800">
                    <td className="px-4 py-3 font-bold">{row.itemName}</td>
                    <td className="px-4 py-3 text-red-400">
                      {Math.abs(row.quantity)} {row.unit}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{row.reason}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!wastageRows.length ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-zinc-500"
                    >
                      No wastage recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-zinc-950 text-sm uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Change</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row) => (
                <tr key={row.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3 font-bold">{row.itemName}</td>
                  <td className="px-4 py-3">
                    <Badge tone={txTone(row.type)}>{row.type}</Badge>
                  </td>
                  <td
                    className={`px-4 py-3 font-bold ${
                      row.quantity >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {row.quantity > 0 ? `+${row.quantity}` : row.quantity}{" "}
                    {row.unit}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{row.reason || "—"}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!historyRows.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    No stock history found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
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
              <Select
                value={
                  knownCategories.includes(itemForm.category)
                    ? itemForm.category
                    : itemForm.category
                      ? "__custom__"
                      : undefined
                }
                onValueChange={(v) => {
                  if (v === "__custom__") {
                    setItemForm((f) => ({ ...f, category: "" }));
                    return;
                  }
                  setItemForm((f) => ({ ...f, category: v }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick or type below" />
                </SelectTrigger>
                <SelectContent>
                  {knownCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Custom...</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                value={itemForm.category}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="e.g. Dairy, Meat, Bakery"
              />
            </div>

            <div className="space-y-2">
              <Label>Unit Kind</Label>
              <Select value={itemForm.unitKind} onValueChange={setUnitKind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">
                Base unit: {baseUnitForKind(itemForm.unitKind)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Purchase Unit</Label>
              <Select
                value={itemForm.purchaseUnit}
                onValueChange={setPurchaseUnit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {purchaseUnitOptions.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                  {!purchaseUnitOptions.includes(itemForm.purchaseUnit) &&
                  itemForm.purchaseUnit ? (
                    <SelectItem value={itemForm.purchaseUnit}>
                      {itemForm.purchaseUnit}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                value={itemForm.purchaseUnit}
                onChange={(e) => setPurchaseUnit(e.target.value)}
                placeholder="Or type custom unit"
              />
            </div>

            <div className="space-y-2">
              <Label>Units Per Purchase</Label>
              <Input
                type="number"
                min={1}
                value={itemForm.unitsPerPurchase}
                onChange={(e) =>
                  setItemForm((f) => ({
                    ...f,
                    unitsPerPurchase: Number(e.target.value) || 1,
                  }))
                }
              />
              <p className="text-xs text-zinc-500">
                Base units in one {itemForm.purchaseUnit || "purchase unit"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                {editing
                  ? `Current Stock (${baseUnitForKind(itemForm.unitKind)})`
                  : `Opening Stock (${itemForm.purchaseUnit || "purchase units"})`}
              </Label>
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
              {!editing ? (
                <p className="text-xs text-zinc-500">
                  Saves as{" "}
                  {Math.round(
                    Number(itemForm.currentStock || 0) *
                      (Number(itemForm.unitsPerPurchase || 0) || 1),
                  )}{" "}
                  {baseUnitForKind(itemForm.unitKind)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>
                Minimum Stock ({baseUnitForKind(itemForm.unitKind)})
              </Label>
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
              <Label>Purchase Price (per purchase unit)</Label>
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
            <Button
              variant="secondary"
              onClick={() => setOpenItemDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveItem}>{editing ? "Save" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
