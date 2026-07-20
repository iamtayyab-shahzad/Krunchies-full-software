"use client";

import { useState } from "react";
import Image from "next/image";
import { EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
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
import { mockCategories, type Category } from "@/lib/mock-data";

const empty = (): Omit<Category, "id"> => ({
  name: "",
  slug: "",
  image:
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80",
  displayOrder: 1,
  hidden: false,
});

export default function CategoriesPage() {
  const [categories, setCategories] = useState(mockCategories);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(empty());

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...empty(),
      displayOrder: categories.length + 1,
    });
    setOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ ...cat });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    const slug =
      form.slug.trim() ||
      form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload: Category = {
      id: editing?.id || `c-${Date.now()}`,
      ...form,
      slug,
    };
    setCategories((prev) =>
      editing
        ? prev.map((c) => (c.id === editing.id ? payload : c))
        : [...prev, payload].sort((a, b) => a.displayOrder - b.displayOrder),
    );
    toast.success(editing ? "Category updated" : "Category added");
    setOpen(false);
  };

  const remove = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success("Category deleted");
  };

  const toggleHide = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, hidden: !c.hidden } : c)),
    );
    toast.success("Visibility updated");
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize menu categories and display order"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories
          .slice()
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((cat) => (
            <div
              key={cat.id}
              className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
            >
              <div className="relative h-36 w-full bg-zinc-900">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-cover"
                  sizes="400px"
                />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-black">{cat.name}</p>
                    <p className="text-sm text-zinc-500">/{cat.slug}</p>
                  </div>
                  <Badge tone={cat.hidden ? "danger" : "success"}>
                    {cat.hidden ? "Hidden" : "Visible"}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-400">
                  Display order:{" "}
                  <span className="font-bold text-white">{cat.displayOrder}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEdit(cat)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleHide(cat.id)}
                  >
                    <EyeOff className="h-4 w-4" />
                    {cat.hidden ? "Show" : "Hide"}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => remove(cat.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto from name if empty"
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={form.displayOrder}
                onChange={(e) =>
                  setForm({ ...form, displayOrder: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-3">
              <Label>Hidden</Label>
              <Switch
                checked={form.hidden}
                onCheckedChange={(v) => setForm({ ...form, hidden: v })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
