"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  locationsApi,
  settingsApi,
  type DeliveryLocationRow,
  type NamalDeliveryConfig,
} from "@/services/api";

const DEFAULT_NAMAL: NamalDeliveryConfig = {
  enabled: false,
  campus_location_id: "50000000-0000-4000-8000-000000000004",
  hostel_location_id: "50000000-0000-4000-8000-000000000005",
  campus_order_start: "08:00",
  campus_order_end: "12:45",
  campus_delivery_start_mon_thu: "13:30",
  campus_delivery_end_mon_thu: "14:00",
  campus_delivery_start_fri: "14:00",
  campus_delivery_end_fri: "14:30",
  hostel_order_start: "08:00",
  hostel_order_end: "19:30",
  hostel_delivery_start: "20:00",
  hostel_delivery_end: "20:30",
};

function parseNamal(raw?: string): NamalDeliveryConfig {
  if (!raw?.trim()) return { ...DEFAULT_NAMAL };
  try {
    return { ...DEFAULT_NAMAL, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NAMAL };
  }
}

/** Namal University free scheduled delivery — under Website Settings. */
export function NamalDeliveryPanel() {
  const [locations, setLocations] = useState<DeliveryLocationRow[]>([]);
  const [cfg, setCfg] = useState<NamalDeliveryConfig>({ ...DEFAULT_NAMAL });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    const [locs, settings] = await Promise.all([
      locationsApi.list(),
      settingsApi.get(),
    ]);
    setLocations(locs);
    setCfg(parseNamal(settings.namal_delivery));
  };

  useEffect(() => {
    reload()
      .catch((e) =>
        toast.error(
          e instanceof Error ? e.message : "Failed to load Namal settings",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.updateNamalDelivery(cfg);
      toast.success("Namal delivery settings saved");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const setField = <K extends keyof NamalDeliveryConfig>(
    key: K,
    value: NamalDeliveryConfig[K],
  ) => setCfg((c) => ({ ...c, [key]: value }));

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading Namal settings…</p>;
  }

  return (
    <div id="namal-delivery" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Namal free delivery</h2>
        <p className="text-sm text-zinc-400">
          Free same-day scheduled delivery for Namal University &amp; Hostel.
          Students can still choose ASAP with the normal delivery fee anytime
          the shop is open.
        </p>
      </div>

      <Card className="space-y-5">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5 accent-orange-500"
            checked={cfg.enabled}
            onChange={(e) => setField("enabled", e.target.checked)}
          />
          <span className="font-semibold text-white">
            Enable Namal free delivery offer
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Campus location</Label>
            <select
              className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm"
              value={cfg.campus_location_id}
              onChange={(e) => setField("campus_location_id", e.target.value)}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Hostel location</Label>
            <select
              className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm"
              value={cfg.hostel_location_id}
              onChange={(e) => setField("hostel_location_id", e.target.value)}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
          <h3 className="font-bold text-orange-400">Campus (Mon–Fri)</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Order window daily Mon–Fri. Delivery Mon–Thu vs Friday can differ.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TimeField
              label="Order from"
              value={cfg.campus_order_start}
              onChange={(v) => setField("campus_order_start", v)}
            />
            <TimeField
              label="Order until"
              value={cfg.campus_order_end}
              onChange={(v) => setField("campus_order_end", v)}
            />
            <TimeField
              label="Mon–Thu deliver from"
              value={cfg.campus_delivery_start_mon_thu}
              onChange={(v) => setField("campus_delivery_start_mon_thu", v)}
            />
            <TimeField
              label="Mon–Thu deliver until"
              value={cfg.campus_delivery_end_mon_thu}
              onChange={(v) => setField("campus_delivery_end_mon_thu", v)}
            />
            <TimeField
              label="Friday deliver from"
              value={cfg.campus_delivery_start_fri}
              onChange={(v) => setField("campus_delivery_start_fri", v)}
            />
            <TimeField
              label="Friday deliver until"
              value={cfg.campus_delivery_end_fri}
              onChange={(v) => setField("campus_delivery_end_fri", v)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
          <h3 className="font-bold text-orange-400">Hostel (every day)</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TimeField
              label="Order from"
              value={cfg.hostel_order_start}
              onChange={(v) => setField("hostel_order_start", v)}
            />
            <TimeField
              label="Order until"
              value={cfg.hostel_order_end}
              onChange={(v) => setField("hostel_order_end", v)}
            />
            <TimeField
              label="Deliver from"
              value={cfg.hostel_delivery_start}
              onChange={(v) => setField("hostel_delivery_start", v)}
            />
            <TimeField
              label="Deliver until"
              value={cfg.hostel_delivery_end}
              onChange={(v) => setField("hostel_delivery_end", v)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Namal settings"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-400">{label}</Label>
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
