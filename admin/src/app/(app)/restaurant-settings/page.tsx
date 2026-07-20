"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockRestaurantSettings } from "@/lib/mock-data";

export default function RestaurantSettingsPage() {
  const [form, setForm] = useState(mockRestaurantSettings);

  return (
    <div>
      <PageHeader
        title="Restaurant Settings"
        description="Core restaurant identity, hours, currency, and COD fee"
        action={
          <Button onClick={() => toast.success("Restaurant settings saved (mock)")}>
            Save Settings
          </Button>
        }
      />

      <Card className="mx-auto max-w-3xl space-y-4">
        <div className="space-y-2">
          <Label>Restaurant Name</Label>
          <Input
            value={form.restaurantName}
            onChange={(e) =>
              setForm({ ...form, restaurantName: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Logo URL</Label>
          <Input
            value={form.logo}
            onChange={(e) => setForm({ ...form, logo: e.target.value })}
          />
          <Input
            type="file"
            accept="image/*"
            onChange={() =>
              toast.message("Mock logo upload — backend later")
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Opening Hours</Label>
            <Input
              value={form.openingHours}
              onChange={(e) =>
                setForm({ ...form, openingHours: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Closing Hours</Label>
            <Input
              value={form.closingHours}
              onChange={(e) =>
                setForm({ ...form, closingHours: e.target.value })
              }
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Cash On Delivery Fee</Label>
            <Input
              type="number"
              value={form.cashOnDeliveryFee}
              onChange={(e) =>
                setForm({
                  ...form,
                  cashOnDeliveryFee: Number(e.target.value),
                })
              }
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
