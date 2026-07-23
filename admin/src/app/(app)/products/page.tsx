"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type Category,
  type PizzaSize,
  type Product,
} from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import { categoriesApi, productsApi } from "@/services/api";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80";

function isDirectImageUrl(url: string) {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  if (url.includes("images.unsplash.com/photo-")) return true;
  try {
    const u = new URL(url);
    return /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(u.pathname);
  } catch {
    return false;
  }
}

function safeProductImage(url: string) {
  return isDirectImageUrl(url) ? url : FALLBACK_PRODUCT_IMAGE;
}

const emptyForm = (categories: Category[]): Omit<Product, "id"> => ({
  name: "",
  categoryId: categories[0]?.id || "",
  description: "",
  image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80",
  available: true,
  featured: false,
  basePrice: 0,
  pizzaSizes: undefined,
});

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(() => emptyForm([]));
  const [useSizes, setUseSizes] = useState(false);
  const [sizes, setSizes] = useState<PizzaSize[]>([
    { label: "S", price: 0 },
    { label: "M", price: 0 },
    { label: "L", price: 0 },
    { label: "XL", price: 0 },
  ]);

  // Load categories + products from backend.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [cats, prods] = await Promise.all([
        categoriesApi.list(),
        productsApi.list(),
      ]);
      if (cancelled) return;
      setCategories(cats);
      setProducts(prods);
      setLoading(false);
      // If create dialog opens early, make sure default category is valid.
      setForm(emptyForm(cats));
    };
    load().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load products");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryName = useMemo(() => {
    const map = Object.fromEntries(categories.map((c) => [c.id, c.name]));
    return (id: string) => map[id] || "—";
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const cat = categoryName(p.categoryId).toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        cat.includes(q)
      );
    });
  }, [products, search, categoryName]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(categories));
    setUseSizes(true);
    setSizes([
      { label: "S", price: 0 },
      { label: "M", price: 0 },
      { label: "L", price: 0 },
      { label: "XL", price: 0 },
    ]);
    setOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({ ...product });
    setUseSizes(Boolean(product.pizzaSizes?.length));
    setSizes(
      product.pizzaSizes?.length
        ? product.pizzaSizes
        : [
            { label: "S", price: 0 },
            { label: "M", price: 0 },
            { label: "L", price: 0 },
            { label: "XL", price: 0 },
          ],
    );
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!form.categoryId) {
      toast.error("Category is required");
      return;
    }
    if (!isDirectImageUrl(form.image)) {
      toast.error(
        "Paste a direct image link (e.g. images.unsplash.com/photo-...), not a search page URL",
      );
      return;
    }
    try {
      const pizzaSizes: PizzaSize[] = useSizes
        ? sizes
        : [{ label: "Regular", price: form.basePrice }];

      if (editing) {
        await productsApi.update(editing.id, {
          categoryId: form.categoryId,
          name: form.name,
          description: form.description,
          image: form.image,
          featured: form.featured,
          available: form.available,
          pizzaSizes,
        });
        toast.success("Product updated");
      } else {
        await productsApi.create({
          categoryId: form.categoryId,
          name: form.name,
          description: form.description,
          image: form.image,
          featured: form.featured,
          available: form.available,
          pizzaSizes,
        });
        toast.success("Product added");
      }

      const [cats, prods] = await Promise.all([
        categoriesApi.list(),
        productsApi.list(),
      ]);
      setCategories(cats);
      setProducts(prods);
      setForm(emptyForm(cats));
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (id: string) => {
    try {
      if (!confirm("Delete this product?")) return;
      await productsApi.remove(id);
      toast.success("Product deleted");
      const [cats, prods] = await Promise.all([
        categoriesApi.list(),
        productsApi.list(),
      ]);
      setCategories(cats);
      setProducts(prods);
      setForm(emptyForm(cats));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-zinc-400">
        Loading products...
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Add, edit, and manage menu products"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />

      <div className="mb-4 max-w-md">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, description, or category..."
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-zinc-950 text-sm uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  {search.trim()
                    ? "No products match your search."
                    : "No products yet."}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
              <tr key={product.id} className="border-t border-zinc-800">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-zinc-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={safeProductImage(product.image)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-bold">{product.name}</p>
                      <p className="line-clamp-1 text-sm text-zinc-500">
                        {product.description}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {categoryName(product.categoryId)}
                </td>
                <td className="px-4 py-3 font-bold text-orange-400">
                  {product.pizzaSizes?.length
                    ? product.pizzaSizes
                        .map((s) => `${s.label}: ${formatPrice(s.price)}`)
                        .join(" · ")
                    : formatPrice(product.basePrice)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={product.available ? "success" : "danger"}>
                    {product.available ? "Available" : "Unavailable"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {product.featured ? (
                    <Badge tone="orange">Featured</Badge>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEdit(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => remove(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
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
            <div className="space-y-2">
              <Label>Base Price</Label>
              <Input
                type="number"
                value={form.basePrice}
                onChange={(e) =>
                  setForm({ ...form, basePrice: Number(e.target.value) })
                }
                disabled={useSizes}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Image URL / Upload path</Label>
              <Input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="Paste image URL or mock upload path"
              />
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setForm((f) => ({
                      ...f,
                      image: String(reader.result || ""),
                    }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-3">
              <Label>Available</Label>
              <Switch
                checked={form.available}
                onCheckedChange={(v) => setForm({ ...form, available: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-3">
              <Label>Featured</Label>
              <Switch
                checked={form.featured}
                onCheckedChange={(v) => setForm({ ...form, featured: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-3 sm:col-span-2">
              <div>
                <Label>Pizza Sizes</Label>
                <p className="text-xs text-zinc-500">
                  Enable sized pricing (S / M / L / XL)
                </p>
              </div>
              <Switch checked={useSizes} onCheckedChange={setUseSizes} />
            </div>
            {useSizes
              ? sizes.map((size, idx) => (
                  <div key={size.label} className="space-y-2">
                    <Label>{size.label} Price</Label>
                    <Input
                      type="number"
                      value={size.price}
                      onChange={(e) => {
                        const next = [...sizes];
                        next[idx] = {
                          ...size,
                          price: Number(e.target.value),
                        };
                        setSizes(next);
                      }}
                    />
                  </div>
                ))
              : null}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save Product</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
