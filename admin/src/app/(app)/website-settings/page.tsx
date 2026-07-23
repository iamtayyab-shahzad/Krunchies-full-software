"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mockWebsiteSettings, type WebsiteSettings } from "@/lib/mock-data";
import { settingsApi } from "@/services/api";

type WebsiteForm = WebsiteSettings & {
  googleMaps: string;
  facebook: string;
  instagram: string;
};

const emptyForm = (): WebsiteForm => ({
  ...mockWebsiteSettings,
  googleMaps: "",
  facebook: "",
  instagram: "",
});

export default function WebsiteSettingsPage() {
  const [form, setForm] = useState<WebsiteForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    settingsApi
      .get()
      .then((s) => {
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          restaurantName: s.restaurant_name || "",
          logo: s.logo || "",
          phone: s.phone || "",
          whatsapp: s.whatsapp || "",
          address: s.address || prev.address || "",
          openingTime: s.opening_time || "",
          closingTime: s.closing_time || "",
          googleMaps: s.google_maps || "",
          facebook: s.facebook || "",
          instagram: s.instagram || "",
        }));
      })
      .catch((e) =>
        toast.error(
          e instanceof Error ? e.message : "Failed to load website settings",
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
        logo: form.logo,
        phone: form.phone,
        whatsapp: form.whatsapp,
        address: form.address,
        opening_time: form.openingTime,
        closing_time: form.closingTime,
        google_maps: form.googleMaps,
        facebook: form.facebook,
        instagram: form.instagram,
      });
      // #region agent log
      fetch("http://127.0.0.1:7888/ingest/8bfa3430-75a3-4f8f-9f4b-0fb77dfcf7ef",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"ec6f7f"},body:JSON.stringify({sessionId:"ec6f7f",hypothesisId:"S1",location:"website-settings/page.tsx:save",message:"settings saved",data:{restaurant_name:form.restaurantName,phone:form.phone,address:form.address,opening_time:form.openingTime,facebook:form.facebook},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      toast.success(
        "Website settings saved (brand/contact/social). Content blocks below are not stored yet.",
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to save website settings",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-zinc-400">
        Loading website settings...
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Website Settings"
        description="Content and branding shown on the customer website"
        action={
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Brand & Contact</h2>
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
                toast.message("Mock logo upload — will use backend later")
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
              <Label>
                Alternate Phone{" "}
                <span className="font-normal text-zinc-500">(not saved)</span>
              </Label>
              <Input
                value={form.alternatePhone}
                onChange={(e) =>
                  setForm({ ...form, alternatePhone: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>WhatsApp Number</Label>
            <Input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Opening Time</Label>
              <Input
                value={form.openingTime}
                onChange={(e) =>
                  setForm({ ...form, openingTime: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Closing Time</Label>
              <Input
                value={form.closingTime}
                onChange={(e) =>
                  setForm({ ...form, closingTime: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Google Maps URL</Label>
            <Input
              value={form.googleMaps}
              onChange={(e) =>
                setForm({ ...form, googleMaps: e.target.value })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input
                value={form.facebook}
                onChange={(e) =>
                  setForm({ ...form, facebook: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input
                value={form.instagram}
                onChange={(e) =>
                  setForm({ ...form, instagram: e.target.value })
                }
              />
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Website Content</h2>
          <p className="text-sm text-zinc-500">
            These fields are UI-only for now — no matching backend columns yet.
          </p>
          <div className="space-y-2">
            <Label>
              Homepage Banner URL{" "}
              <span className="font-normal text-zinc-500">(not saved)</span>
            </Label>
            <Input
              value={form.homepageBanner}
              onChange={(e) =>
                setForm({ ...form, homepageBanner: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>
              About Section{" "}
              <span className="font-normal text-zinc-500">(not saved)</span>
            </Label>
            <Textarea
              value={form.aboutSection}
              onChange={(e) =>
                setForm({ ...form, aboutSection: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>
              Contact Section{" "}
              <span className="font-normal text-zinc-500">(not saved)</span>
            </Label>
            <Textarea
              value={form.contactSection}
              onChange={(e) =>
                setForm({ ...form, contactSection: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>
              Footer Information{" "}
              <span className="font-normal text-zinc-500">(not saved)</span>
            </Label>
            <Textarea
              value={form.footerInfo}
              onChange={(e) =>
                setForm({ ...form, footerInfo: e.target.value })
              }
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
