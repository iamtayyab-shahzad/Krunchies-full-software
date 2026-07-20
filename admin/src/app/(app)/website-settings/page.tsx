"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mockWebsiteSettings } from "@/lib/mock-data";

export default function WebsiteSettingsPage() {
  const [form, setForm] = useState(mockWebsiteSettings);

  const save = () => {
    toast.success("Website settings saved (mock)");
  };

  return (
    <div>
      <PageHeader
        title="Website Settings"
        description="Content and branding shown on the customer website"
        action={<Button onClick={save}>Save Settings</Button>}
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
              <Label>Alternate Phone</Label>
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
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Website Content</h2>
          <div className="space-y-2">
            <Label>Homepage Banner URL</Label>
            <Input
              value={form.homepageBanner}
              onChange={(e) =>
                setForm({ ...form, homepageBanner: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>About Section</Label>
            <Textarea
              value={form.aboutSection}
              onChange={(e) =>
                setForm({ ...form, aboutSection: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Section</Label>
            <Textarea
              value={form.contactSection}
              onChange={(e) =>
                setForm({ ...form, contactSection: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Footer Information</Label>
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
