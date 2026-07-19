"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { formatPrice } from "@/lib/utils";
import {
  categoriesApi,
  productSizesApi,
  productsApi,
} from "@/services/api";
import type { Product } from "@/types";

const emptyForm = {
  name: "",
  description: "",
  image: "",
  category_id: "",
  featured: false,
  available: true,
  display_order: 0,
  sizesText: "Small:799\nMedium:1199\nLarge:1599",
};

export default function ProductsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [q, setQ] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        p.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [products, q],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || "",
      image: p.image || "",
      category_id: p.category_id,
      featured: p.featured,
      available: p.available,
      display_order: p.display_order,
      sizesText: (p.sizes || [])
        .map((s) => `${s.size}:${s.price}`)
        .join("\n"),
    });
    setOpen(true);
  };

  const onImage = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, image: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.name || !form.category_id) {
      toast.error("Name and category required");
      return;
    }
    try {
      if (editing) {
        await productsApi.update(editing.id, {
          name: form.name,
          description: form.description,
          image: form.image,
          category_id: form.category_id,
          featured: form.featured,
          available: form.available,
          display_order: Number(form.display_order),
        });
        // Update sizes simply: create missing ones
        const lines = form.sizesText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        for (const line of lines) {
          const [size, price] = line.split(":");
          if (!size || !price) continue;
          const existing = (editing.sizes || []).find(
            (s) => s.size.toLowerCase() === size.trim().toLowerCase(),
          );
          if (existing) {
            await productSizesApi.update(existing.id, {
              price: Number(price),
              size: size.trim(),
            });
          } else {
            await productSizesApi.create({
              product_id: editing.id,
              size: size.trim(),
              price: Number(price),
            });
          }
        }
        toast.success("Product updated");
      } else {
        const created = await productsApi.create({
          name: form.name,
          description: form.description,
          image: form.image,
          category_id: form.category_id,
          featured: form.featured,
          available: form.available,
          display_order: Number(form.display_order),
        });
        const lines = form.sizesText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        for (const line of lines) {
          const [size, price] = line.split(":");
          if (!size || !price) continue;
          await productSizesApi.create({
            product_id: created.id,
            size: size.trim(),
            price: Number(price),
          });
        }
        toast.success("Product created");
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await productsApi.remove(id);
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const toggle = async (p: Product, field: "available" | "featured") => {
    try {
      await productsApi.update(p.id, { [field]: !p[field] });
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Products</h1>
        <div className="flex gap-2">
          <Input
            className="w-64"
            placeholder="Search..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button onClick={openCreate}>Add Product</Button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-lg font-bold">{p.name}</p>
              <p className="text-sm text-zinc-400">
                {(p.sizes || [])
                  .map((s) => `${s.size} ${formatPrice(s.price)}`)
                  .join(" · ") || "No sizes"}
              </p>
              <div className="mt-2 flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={p.available}
                    onCheckedChange={() => toggle(p, "available")}
                  />
                  Available
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={p.featured}
                    onCheckedChange={() => toggle(p, "featured")}
                  />
                  Featured
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => openEdit(p)}>
                Edit
              </Button>
              <Button variant="danger" onClick={() => remove(p.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm({ ...form, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Image URL or Upload</Label>
              <Input
                value={form.image.startsWith("data:") ? "" : form.image}
                placeholder="https://..."
                onChange={(e) => setForm({ ...form, image: e.target.value })}
              />
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => onImage(e.target.files?.[0])}
              />
            </div>
            <div className="space-y-1">
              <Label>Sizes (one per line: Size:Price)</Label>
              <Textarea
                value={form.sizesText}
                onChange={(e) =>
                  setForm({ ...form, sizesText: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.available}
                  onCheckedChange={(v) => setForm({ ...form, available: v })}
                />
                Available
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.featured}
                  onCheckedChange={(v) => setForm({ ...form, featured: v })}
                />
                Featured
              </label>
            </div>
            <Button className="w-full" size="lg" onClick={save}>
              Save Product
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
