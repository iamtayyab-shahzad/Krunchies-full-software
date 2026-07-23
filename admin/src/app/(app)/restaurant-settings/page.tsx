"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockRestaurantSettings, type RestaurantSettings } from "@/lib/mock-data";
import { settingsApi } from "@/services/api";

export default function RestaurantSettingsPage() {
  const [form, setForm] = useState<RestaurantSettings>(mockRestaurantSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    settingsApi
      .get()
      .then((s) => {
        if (cancelled) return;
        setForm({
          restaurantName: s.restaurant_name || "",
          logo: s.logo || "",
          phone: s.phone || "",
          whatsapp: s.whatsapp || "",
          openingHours: s.opening_time || "",
          closingHours: s.closing_time || "",
          currency: s.currency || "Rs",
          cashOnDeliveryFee: s.cash_on_delivery_fee ?? 0,
        });
        // #region agent log
        fetch("http://127.0.0.1:7888/ingest/8bfa3430-75a3-4f8f-9f4b-0fb77dfcf7ef",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"ec6f7f"},body:JSON.stringify({sessionId:"ec6f7f",hypothesisId:"S2",location:"restaurant-settings/page.tsx:load",message:"settings loaded",data:{restaurant_name:s.restaurant_name,phone:s.phone,opening_time:s.opening_time,currency:s.currency,cash_on_delivery_fee:s.cash_on_delivery_fee},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      })
      .catch((e) =>
        toast.error(
          e instanceof Error ? e.message : "Failed to load restaurant settings",
        ),
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update({
        restaurant_name: form.restaurantName,
        phone: form.phone,
        whatsapp: form.whatsapp,
        logo: form.logo,
        opening_time: form.openingHours,
        closing_time: form.closingHours,
        currency: form.currency,
        cash_on_delivery_fee: Number(form.cashOnDeliveryFee || 0),
      });
      // #region agent log
      fetch("http://127.0.0.1:7888/ingest/8bfa3430-75a3-4f8f-9f4b-0fb77dfcf7ef",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"ec6f7f"},body:JSON.stringify({sessionId:"ec6f7f",hypothesisId:"S2",location:"restaurant-settings/page.tsx:save",message:"restaurant settings saved",data:{restaurant_name:form.restaurantName,phone:form.phone,opening_time:form.openingHours,currency:form.currency,cash_on_delivery_fee:form.cashOnDeliveryFee},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      toast.success("Restaurant settings saved");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to save restaurant settings",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-zinc-400">
        Loading restaurant settings...
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Restaurant Settings"
        description="Core restaurant identity, hours, currency, and COD fee"
        action={
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
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
