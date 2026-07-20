"use client";

import { useEffect, useState } from "react";
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
import { type Deal } from "@/lib/mock-data";
import { offersApi } from "@/services/api";

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
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState(empty());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const list = await offersApi.list();
      if (cancelled) return;
      setDeals(list);
      setLoading(false);
    };
    load().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load deals");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Deal title is required");
      return;
    }

    try {
      if (editing) {
        await offersApi.update(editing.id, {
          title: form.title,
          description: form.description,
          image: form.image,
          active: form.enabled,
          offer_popup: form.offerPopup,
          homepage_deal: form.homepageDeal,
          discount_label: form.discountLabel,
        });
        toast.success("Deal updated");
      } else {
        await offersApi.create({
          title: form.title,
          description: form.description,
          image: form.image,
          enabled: form.enabled,
          offerPopup: form.offerPopup,
          homepageDeal: form.homepageDeal,
          discountLabel: form.discountLabel,
        });
        toast.success("Deal created");
      }

      const list = await offersApi.list();
      setDeals(list);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const refresh = async () => {
    const list = await offersApi.list();
    setDeals(list);
  };

  const remove = async (id: string) => {
    try {
      if (!confirm("Delete this deal?")) return;
      await offersApi.remove(id);
      toast.success("Deal deleted");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      if (enabled) await offersApi.enable(id);
      else await offersApi.disable(id);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const togglePopup = async (id: string, value: boolean) => {
    try {
      await offersApi.update(id, { offer_popup: value });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const toggleHomepage = async (id: string, value: boolean) => {
    try {
      await offersApi.update(id, { homepage_deal: value });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-zinc-400">
        Loading deals...
      </div>
    );
  }

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
                    onCheckedChange={(v) => toggleEnabled(deal.id, v)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2">
                  <span className="text-sm">Popup</span>
                  <Switch
                    checked={deal.offerPopup}
                    onCheckedChange={(v) => togglePopup(deal.id, v)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2">
                  <span className="text-sm">Homepage</span>
                  <Switch
                    checked={deal.homepageDeal}
                    onCheckedChange={(v) => toggleHomepage(deal.id, v)}
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
