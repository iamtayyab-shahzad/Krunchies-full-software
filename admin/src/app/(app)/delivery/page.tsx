"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  mockDeliveryLocations,
  mockRestaurantSettings,
  type DeliveryLocation,
} from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

export default function DeliveryPage() {
  const [locations, setLocations] = useState(mockDeliveryLocations);
  const [codFee, setCodFee] = useState(
    mockRestaurantSettings.cashOnDeliveryFee,
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryLocation | null>(null);
  const [form, setForm] = useState({
    name: "",
    charge: 0,
    active: true,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", charge: 0, active: true });
    setOpen(true);
  };

  const openEdit = (loc: DeliveryLocation) => {
    setEditing(loc);
    setForm({ name: loc.name, charge: loc.charge, active: loc.active });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) {
      toast.error("Location name is required");
      return;
    }
    const payload: DeliveryLocation = {
      id: editing?.id || `dl-${Date.now()}`,
      ...form,
    };
    setLocations((prev) =>
      editing
        ? prev.map((l) => (l.id === editing.id ? payload : l))
        : [...prev, payload],
    );
    toast.success(editing ? "Location updated" : "Location added");
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Delivery Charges"
        description="Manage delivery locations, fees, and COD charges"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Cash On Delivery Fee</h2>
            <p className="text-sm text-zinc-400">
              Extra fee applied when customers choose COD
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-2">
              <Label>COD Fee (Rs)</Label>
              <Input
                type="number"
                className="w-40"
                value={codFee}
                onChange={(e) => setCodFee(Number(e.target.value))}
              />
            </div>
            <Button
              onClick={() => toast.success("COD fee saved (mock)")}
            >
              Save Fee
            </Button>
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[700px] text-left">
          <thead className="bg-zinc-950 text-sm uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Charge</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => (
              <tr key={loc.id} className="border-t border-zinc-800">
                <td className="px-4 py-3 font-bold">{loc.name}</td>
                <td className="px-4 py-3 text-orange-400">
                  {loc.charge === 0 ? "Free" : formatPrice(loc.charge)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Badge tone={loc.active ? "success" : "danger"}>
                      {loc.active ? "Active" : "Inactive"}
                    </Badge>
                    <Switch
                      checked={loc.active}
                      onCheckedChange={(v) =>
                        setLocations((prev) =>
                          prev.map((l) =>
                            l.id === loc.id ? { ...l, active: v } : l,
                          ),
                        )
                      }
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEdit(loc)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setLocations((prev) =>
                          prev.filter((l) => l.id !== loc.id),
                        );
                        toast.success("Location removed");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Location" : "Add Location"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Charge</Label>
              <Input
                type="number"
                value={form.charge}
                onChange={(e) =>
                  setForm({ ...form, charge: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-3">
              <Label>Active</Label>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
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
