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
  campus_free_threshold: 2000,
  hostel_min_order: 1500,
  hostel_free_threshold: 5000,
};

function parseNamal(raw?: string): NamalDeliveryConfig {
  if (!raw?.trim()) return { ...DEFAULT_NAMAL };
  try {
    return { ...DEFAULT_NAMAL, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NAMAL };
  }
}

/** Namal University / Hostel free delivery — amount-based, under Website Settings. */
export function NamalDeliveryPanel() {
  const [locations, setLocations] = useState<DeliveryLocationRow[]>([]);
  const [cfg, setCfg] = useState<NamalDeliveryConfig>({ ...DEFAULT_NAMAL });
  const [campusFee, setCampusFee] = useState(150);
  const [hostelFee, setHostelFee] = useState(150);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    const [locs, settings] = await Promise.all([
      locationsApi.list(),
      settingsApi.get(),
    ]);
    setLocations(locs);
    const parsed = parseNamal(settings.namal_delivery);
    setCfg(parsed);
    setCampusFee(
      locs.find((l) => l.id === parsed.campus_location_id)?.charge ?? 150,
    );
    setHostelFee(
      locs.find((l) => l.id === parsed.hostel_location_id)?.charge ?? 150,
    );
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
      const campus = locations.find((l) => l.id === cfg.campus_location_id);
      const hostel = locations.find((l) => l.id === cfg.hostel_location_id);
      if (campus) {
        await locationsApi.update(campus.id, {
          name: campus.name,
          charge: Number(campusFee || 0),
        });
      }
      if (hostel) {
        await locationsApi.update(hostel.id, {
          name: hostel.name,
          charge: Number(hostelFee || 0),
        });
      }
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
          No time windows. Students pick{" "}
          <strong className="text-zinc-300">Namal University</strong> or{" "}
          <strong className="text-zinc-300">Namal Hostel</strong>, and delivery
          is free once their order reaches the threshold below. Below the
          hostel minimum, the order can&apos;t be placed at all.
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
              onChange={(e) => {
                setField("campus_location_id", e.target.value);
                setCampusFee(
                  locations.find((l) => l.id === e.target.value)?.charge ??
                    campusFee,
                );
              }}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <Label className="text-xs text-zinc-500">
              Normal delivery fee (Rs) — charged below the free threshold
            </Label>
            <Input
              type="number"
              min={0}
              value={campusFee}
              onChange={(e) => setCampusFee(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Hostel location</Label>
            <select
              className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm"
              value={cfg.hostel_location_id}
              onChange={(e) => {
                setField("hostel_location_id", e.target.value);
                setHostelFee(
                  locations.find((l) => l.id === e.target.value)?.charge ??
                    hostelFee,
                );
              }}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <Label className="text-xs text-zinc-500">
              Normal delivery fee (Rs) — charged between the minimum and the
              free threshold
            </Label>
            <Input
              type="number"
              min={0}
              value={hostelFee}
              onChange={(e) => setHostelFee(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
          <h3 className="font-bold text-orange-400">Namal University</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Orders of this amount or more get free delivery. Below it, the
            normal fee above applies.
          </p>
          <div className="mt-3 max-w-xs space-y-1.5">
            <Label className="text-xs text-zinc-400">
              Free delivery threshold (Rs)
            </Label>
            <Input
              type="number"
              min={0}
              value={cfg.campus_free_threshold}
              onChange={(e) =>
                setField("campus_free_threshold", Number(e.target.value || 0))
              }
            />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
          <h3 className="font-bold text-orange-400">Namal Hostel</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Orders below the minimum are blocked with a clear message. Orders
            at or above the free threshold get free delivery; in between, the
            normal fee above applies.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">
                Minimum order (Rs)
              </Label>
              <Input
                type="number"
                min={0}
                value={cfg.hostel_min_order}
                onChange={(e) =>
                  setField("hostel_min_order", Number(e.target.value || 0))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">
                Free delivery threshold (Rs)
              </Label>
              <Input
                type="number"
                min={0}
                value={cfg.hostel_free_threshold}
                onChange={(e) =>
                  setField(
                    "hostel_free_threshold",
                    Number(e.target.value || 0),
                  )
                }
              />
            </div>
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
