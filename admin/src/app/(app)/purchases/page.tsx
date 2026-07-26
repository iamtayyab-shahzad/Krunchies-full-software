"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { formatPrice } from "@/lib/utils";
import type { InventoryItem, Purchase, Supplier } from "@/lib/mock-data";
import {
  inventoryApi,
  purchasesApi,
  suppliersApi,
} from "@/services/api";

type Tab = "purchases" | "suppliers";

type LineDraft = {
  key: string;
  inventoryId: string;
  purchaseUnit: string;
  quantity: number;
  unitPrice: number;
};

type PurchaseForm = {
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  paymentMethod: string;
  discount: number;
  otherCost: number;
  amountPaid: number;
  notes: string;
  items: LineDraft[];
};

type SupplierForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  contactName: string;
  notes: string;
};

const PAYMENT_METHODS = ["cash", "card", "bank", "jazzcash", "easypaisa"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function newLineKey() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyPurchaseForm(): PurchaseForm {
  return {
    invoiceNumber: "",
    supplierId: "",
    supplierName: "",
    purchaseDate: todayISO(),
    paymentMethod: "cash",
    discount: 0,
    otherCost: 0,
    amountPaid: 0,
    notes: "",
    items: [],
  };
}

function emptySupplierForm(): SupplierForm {
  return {
    name: "",
    phone: "",
    email: "",
    address: "",
    contactName: "",
    notes: "",
  };
}

function statusTone(
  status: string,
): "success" | "warning" | "danger" | "default" | "orange" {
  const s = status.toUpperCase();
  if (s === "COMPLETED" || s === "PAID" || s === "POSTED") return "success";
  if (s === "REVERSED" || s === "CANCELLED") return "danger";
  if (s === "PARTIAL" || s === "DRAFT") return "warning";
  return "orange";
}

export default function PurchasesPage() {
  const [tab, setTab] = useState<Tab>("purchases");
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [openPurchase, setOpenPurchase] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchaseForm());
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState("");

  const [openSupplier, setOpenSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm());

  const refreshAll = async () => {
    const [p, s, inv] = await Promise.all([
      purchasesApi.list(),
      suppliersApi.list(),
      inventoryApi.list(),
    ]);
    setPurchases(p);
    setSuppliers(s);
    setInventory(inv);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        await refreshAll();
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error ? e.message : "Failed to load purchases",
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

  const lineTotal = (line: LineDraft) =>
    Math.round(Number(line.quantity || 0) * Number(line.unitPrice || 0));

  const formSubtotal = useMemo(
    () => purchaseForm.items.reduce((sum, l) => sum + lineTotal(l), 0),
    [purchaseForm.items],
  );

  const formGrandTotal = Math.max(
    0,
    formSubtotal -
      Number(purchaseForm.discount || 0) +
      Number(purchaseForm.otherCost || 0),
  );

  const openCreatePurchase = () => {
    setEditingPurchase(null);
    setPurchaseForm(emptyPurchaseForm());
    setQuickSupplierName("");
    setOpenPurchase(true);
  };

  const openEditPurchase = async (purchase: Purchase) => {
    try {
      const full = await purchasesApi.get(purchase.id);
      setEditingPurchase(full);
      setPurchaseForm({
        invoiceNumber: full.invoiceNumber,
        supplierId: full.supplierId || "",
        supplierName: full.supplierName,
        purchaseDate: full.purchaseDate || todayISO(),
        paymentMethod: full.paymentMethod || "cash",
        discount: full.discount,
        otherCost: full.otherCost,
        amountPaid: full.amountPaid,
        notes: full.notes,
        items: (full.items || []).map((i) => ({
          key: i.id || newLineKey(),
          inventoryId: i.inventoryId,
          purchaseUnit: i.purchaseUnit,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      setQuickSupplierName("");
      setOpenPurchase(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load purchase");
    }
  };

  const addLine = () => {
    const first = inventory[0];
    setPurchaseForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          key: newLineKey(),
          inventoryId: first?.id || "",
          purchaseUnit: first?.purchaseUnit || "pcs",
          quantity: 1,
          unitPrice: first?.purchasePrice || 0,
        },
      ],
    }));
  };

  const updateLine = (key: string, patch: Partial<LineDraft>) => {
    setPurchaseForm((f) => ({
      ...f,
      items: f.items.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    }));
  };

  const onInventoryPicked = (key: string, inventoryId: string) => {
    const item = inventory.find((i) => i.id === inventoryId);
    updateLine(key, {
      inventoryId,
      purchaseUnit: item?.purchaseUnit || "pcs",
      unitPrice: item?.purchasePrice || 0,
    });
  };

  const removeLine = (key: string) => {
    setPurchaseForm((f) => ({
      ...f,
      items: f.items.filter((l) => l.key !== key),
    }));
  };

  const applyQuickSupplier = async () => {
    const name = quickSupplierName.trim();
    if (!name) {
      toast.error("Enter a supplier name");
      return;
    }
    try {
      await suppliersApi.create({ name });
      const list = await suppliersApi.list();
      setSuppliers(list);
      const created = list.find(
        (s) => s.name.toLowerCase() === name.toLowerCase(),
      );
      if (created) {
        setPurchaseForm((f) => ({
          ...f,
          supplierId: created.id,
          supplierName: created.name,
        }));
      } else {
        setPurchaseForm((f) => ({
          ...f,
          supplierId: "",
          supplierName: name,
        }));
      }
      setQuickSupplierName("");
      toast.success("Supplier added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add supplier");
    }
  };

  const savePurchase = async () => {
    if (!purchaseForm.invoiceNumber.trim()) {
      toast.error("Invoice number is required");
      return;
    }
    if (!purchaseForm.items.length) {
      toast.error("Add at least one line item");
      return;
    }
    if (purchaseForm.items.some((l) => !l.inventoryId || l.quantity <= 0)) {
      toast.error("Each line needs an item and quantity > 0");
      return;
    }

    const supplier =
      suppliers.find((s) => s.id === purchaseForm.supplierId) || null;

    const payload = {
      invoiceNumber: purchaseForm.invoiceNumber.trim(),
      supplierId: purchaseForm.supplierId || undefined,
      supplierName: supplier?.name || purchaseForm.supplierName || "",
      purchaseDate: purchaseForm.purchaseDate,
      discount: Number(purchaseForm.discount || 0),
      otherCost: Number(purchaseForm.otherCost || 0),
      paymentMethod: purchaseForm.paymentMethod,
      amountPaid:
        Number(purchaseForm.amountPaid || 0) || formGrandTotal,
      notes: purchaseForm.notes,
      items: purchaseForm.items.map((l) => ({
        inventoryId: l.inventoryId,
        purchaseUnit: l.purchaseUnit,
        quantity: Number(l.quantity || 0),
        unitPrice: Number(l.unitPrice || 0),
        lineTotal: lineTotal(l),
      })),
    };

    setSavingPurchase(true);
    try {
      if (editingPurchase) {
        await purchasesApi.update(editingPurchase.id, payload);
        toast.success("Purchase updated");
      } else {
        await purchasesApi.create(payload);
        toast.success("Purchase created");
      }
      setOpenPurchase(false);
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingPurchase(false);
    }
  };

  const reversePurchase = async (id: string) => {
    if (!confirm("Reverse this purchase? Stock will be rolled back.")) return;
    try {
      await purchasesApi.reverse(id);
      toast.success("Purchase reversed");
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reverse failed");
    }
  };

  const openCreateSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm(emptySupplierForm());
    setOpenSupplier(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name,
      phone: s.phone,
      email: s.email,
      address: s.address,
      contactName: s.contactName,
      notes: s.notes,
    });
    setOpenSupplier(true);
  };

  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    try {
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier.id, {
          ...supplierForm,
          isActive: editingSupplier.isActive,
        });
        toast.success("Supplier updated");
      } else {
        await suppliersApi.create(supplierForm);
        toast.success("Supplier created");
      }
      setOpenSupplier(false);
      setSuppliers(await suppliersApi.list());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      await suppliersApi.remove(id);
      toast.success("Supplier deleted");
      setSuppliers(await suppliersApi.list());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Stock purchases, invoices, and suppliers"
        action={
          tab === "purchases" ? (
            <Button onClick={openCreatePurchase}>
              <Plus className="h-4 w-4" />
              New Purchase
            </Button>
          ) : (
            <Button onClick={openCreateSupplier}>
              <Plus className="h-4 w-4" />
              Add Supplier
            </Button>
          )
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["purchases", "Purchases"],
            ["suppliers", "Suppliers"],
          ] as const
        ).map(([key, label]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
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
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center text-zinc-400">
          Loading...
        </div>
      ) : tab === "purchases" ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-zinc-950 text-sm uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3 font-bold">{p.invoiceNumber}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {p.supplierName || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{p.purchaseDate}</td>
                  <td className="px-4 py-3 text-orange-400">
                    {formatPrice(p.grandTotal)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEditPurchase(p)}
                        disabled={p.status.toUpperCase() === "REVERSED"}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => reversePurchase(p.id)}
                        disabled={p.status.toUpperCase() === "REVERSED"}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reverse
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!purchases.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    No purchases yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-zinc-950 text-sm uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-400" />
                      <span className="font-bold">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {s.contactName || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{s.phone || "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{s.email || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEditSupplier(s)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteSupplier(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!suppliers.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    No suppliers yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={openPurchase} onOpenChange={setOpenPurchase}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPurchase ? "Edit Purchase" : "New Purchase"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Invoice #</Label>
              <Input
                value={purchaseForm.invoiceNumber}
                onChange={(e) =>
                  setPurchaseForm((f) => ({
                    ...f,
                    invoiceNumber: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={purchaseForm.purchaseDate}
                onChange={(e) =>
                  setPurchaseForm((f) => ({
                    ...f,
                    purchaseDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select
                value={purchaseForm.supplierId || undefined}
                onValueChange={(id) => {
                  const s = suppliers.find((x) => x.id === id);
                  setPurchaseForm((f) => ({
                    ...f,
                    supplierId: id,
                    supplierName: s?.name || "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Quick add supplier name"
                  value={quickSupplierName}
                  onChange={(e) => setQuickSupplierName(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={applyQuickSupplier}
                >
                  Add
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={purchaseForm.paymentMethod}
                onValueChange={(v) =>
                  setPurchaseForm((f) => ({ ...f, paymentMethod: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Line Items</h3>
              <Button type="button" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4" />
                Add Line
              </Button>
            </div>

            {purchaseForm.items.map((line) => (
              <Card key={line.key} className="!p-4">
                <div className="grid gap-3 sm:grid-cols-5">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Inventory</Label>
                    <Select
                      value={line.inventoryId || undefined}
                      onValueChange={(id) => onInventoryPicked(line.key, id)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
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
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input
                      value={line.purchaseUnit}
                      onChange={(e) =>
                        updateLine(line.key, {
                          purchaseUnit: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.key, {
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      min={0}
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateLine(line.key, {
                          unitPrice: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-zinc-400">
                    Line total{" "}
                    <span className="font-bold text-orange-400">
                      {formatPrice(lineTotal(line))}
                    </span>
                  </p>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => removeLine(line.key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}

            {!purchaseForm.items.length ? (
              <p className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
                No lines yet — click Add Line.
              </p>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Discount</Label>
              <Input
                type="number"
                value={purchaseForm.discount}
                onChange={(e) =>
                  setPurchaseForm((f) => ({
                    ...f,
                    discount: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Other Cost</Label>
              <Input
                type="number"
                value={purchaseForm.otherCost}
                onChange={(e) =>
                  setPurchaseForm((f) => ({
                    ...f,
                    otherCost: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Amount Paid</Label>
              <Input
                type="number"
                value={purchaseForm.amountPaid || formGrandTotal}
                onChange={(e) =>
                  setPurchaseForm((f) => ({
                    ...f,
                    amountPaid: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={purchaseForm.notes}
              onChange={(e) =>
                setPurchaseForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-sm text-zinc-400">
              Subtotal {formatPrice(formSubtotal)} ·{" "}
              <span className="font-bold text-orange-400">
                Grand {formatPrice(formGrandTotal)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setOpenPurchase(false)}
              >
                Cancel
              </Button>
              <Button disabled={savingPurchase} onClick={savePurchase}>
                {savingPurchase
                  ? "Saving..."
                  : editingPurchase
                    ? "Update Purchase"
                    : "Save Purchase"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openSupplier} onOpenChange={setOpenSupplier}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input
                value={supplierForm.contactName}
                onChange={(e) =>
                  setSupplierForm((f) => ({
                    ...f,
                    contactName: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={supplierForm.phone}
                onChange={(e) =>
                  setSupplierForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Email</Label>
              <Input
                value={supplierForm.email}
                onChange={(e) =>
                  setSupplierForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm((f) => ({ ...f, address: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={supplierForm.notes}
                onChange={(e) =>
                  setSupplierForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setOpenSupplier(false)}>
              Cancel
            </Button>
            <Button onClick={saveSupplier}>
              {editingSupplier ? "Save" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
