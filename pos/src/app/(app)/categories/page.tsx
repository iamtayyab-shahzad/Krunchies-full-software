"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { categoriesApi } from "@/services/api";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    image: "",
    display_order: 0,
    visible: true,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", image: "", display_order: 0, visible: true });
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      image: c.image || "",
      display_order: c.display_order,
      visible: c.visible,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name) {
      toast.error("Name required");
      return;
    }
    try {
      if (editing) {
        await categoriesApi.update(editing.id, form);
        toast.success("Category updated");
      } else {
        await categoriesApi.create(form);
        toast.success("Category created");
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["categories"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete category?")) return;
    try {
      await categoriesApi.remove(id);
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["categories"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const move = async (c: Category, dir: -1 | 1) => {
    try {
      await categoriesApi.update(c.id, {
        display_order: c.display_order + dir,
      });
      qc.invalidateQueries({ queryKey: ["categories"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sort failed");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black">Categories</h1>
        <Button onClick={openCreate}>Add Category</Button>
      </div>
      <div className="space-y-3">
        {[...categories]
          .sort((a, b) => a.display_order - b.display_order)
          .map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-lg font-bold">{c.name}</p>
                <p className="text-sm text-zinc-400">
                  Order {c.display_order} · {c.visible ? "Visible" : "Hidden"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => move(c, -1)}>
                  Up
                </Button>
                <Button variant="secondary" onClick={() => move(c, 1)}>
                  Down
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await categoriesApi.update(c.id, { visible: !c.visible });
                    qc.invalidateQueries({ queryKey: ["categories"] });
                  }}
                >
                  {c.visible ? "Hide" : "Show"}
                </Button>
                <Button variant="secondary" onClick={() => openEdit(c)}>
                  Edit
                </Button>
                <Button variant="danger" onClick={() => remove(c.id)}>
                  Delete
                </Button>
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
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Image URL</Label>
              <Input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) =>
                  setForm({ ...form, display_order: Number(e.target.value) })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.visible}
                onCheckedChange={(v) => setForm({ ...form, visible: v })}
              />
              Visible
            </label>
            <Button className="w-full" onClick={save}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
