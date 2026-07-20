"use client";

import { useState } from "react";
import Image from "next/image";
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
import { mockDeals, type Deal } from "@/lib/mock-data";

const empty = (): Omit<Deal, "id"> => ({
  title: "",
  description: "",
  image:
    "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=80",
  enabled: true,
  offerPopup: false,
  homepageDeal: false,
  discountLabel: "DEAL",
});

export default function DealsPage() {
  const [deals, setDeals] = useState(mockDeals);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState(empty());

  const openCreate = () => {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  };

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setForm({ ...deal });
    setOpen(true);
  };

  const save = () => {
    if (!form.title.trim()) {
      toast.error("Deal title is required");
      return;
    }
    const payload: Deal = {
      id: editing?.id || `d-${Date.now()}`,
      ...form,
    };
    setDeals((prev) =>
      editing ? prev.map((d) => (d.id === editing.id ? payload : d)) : [payload, ...prev],
    );
    toast.success(editing ? "Deal updated" : "Deal created");
    setOpen(false);
  };

  const remove = (id: string) => {
    setDeals((prev) => prev.filter((d) => d.id !== id));
    toast.success("Deal deleted");
  };

  const patch = (id: string, patchData: Partial<Deal>) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patchData } : d)),
    );
  };

  return (
    <div>
      <PageHeader
        title="Deals & Offers"
        description="Create promotions, popups, and homepage deals"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create Deal
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
          >
            <div className="relative h-40 w-full bg-zinc-900">
              <Image
                src={deal.image}
                alt={deal.title}
                fill
                className="object-cover"
                sizes="600px"
              />
              <div className="absolute left-3 top-3">
                <Badge tone="orange">{deal.discountLabel}</Badge>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <p className="text-xl font-black">{deal.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{deal.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={deal.enabled ? "success" : "danger"}>
                  {deal.enabled ? "Enabled" : "Disabled"}
                </Badge>
                {deal.offerPopup ? <Badge tone="warning">Offer Popup</Badge> : null}
                {deal.homepageDeal ? (
                  <Badge tone="orange">Homepage Deal</Badge>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2">
                  <span className="text-sm">Enable</span>
                  <Switch
                    checked={deal.enabled}
                    onCheckedChange={(v) => patch(deal.id, { enabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2">
                  <span className="text-sm">Popup</span>
                  <Switch
                    checked={deal.offerPopup}
                    onCheckedChange={(v) => patch(deal.id, { offerPopup: v })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2">
                  <span className="text-sm">Homepage</span>
                  <Switch
                    checked={deal.homepageDeal}
                    onCheckedChange={(v) =>
                      patch(deal.id, { homepageDeal: v })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEdit(deal)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => remove(deal.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Deal" : "Create Deal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Discount Label</Label>
              <Input
                value={form.discountLabel}
                onChange={(e) =>
                  setForm({ ...form, discountLabel: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-3">
                <Label>Enabled</Label>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(v) => setForm({ ...form, enabled: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-3">
                <Label>Popup</Label>
                <Switch
                  checked={form.offerPopup}
                  onCheckedChange={(v) => setForm({ ...form, offerPopup: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-3">
                <Label>Homepage</Label>
                <Switch
                  checked={form.homepageDeal}
                  onCheckedChange={(v) =>
                    setForm({ ...form, homepageDeal: v })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save}>Save Deal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
