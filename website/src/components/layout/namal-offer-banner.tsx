"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSettings } from "@/services/api";
import {
  DEFAULT_NAMAL_CONFIG,
  parseNamalDeliveryConfig,
  type NamalDeliveryConfig,
} from "@/lib/namal-delivery";

/** Single compact strip — no stacked open/offer bars. */
export function NamalOfferBanner() {
  const [cfg, setCfg] = useState<NamalDeliveryConfig | null>(null);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((s) => {
        if (!active) return;
        const parsed = parseNamalDeliveryConfig(s.namal_delivery);
        setCfg(parsed.enabled ? parsed : null);
      })
      .catch(() => {
        if (active) setCfg(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!cfg) return null;
  const c = { ...DEFAULT_NAMAL_CONFIG, ...cfg };

  return (
    <div className="border-b border-emerald-700/50 bg-emerald-500">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-1.5 sm:px-6 lg:px-8">
        <p className="min-w-0 truncate text-xs font-bold text-black sm:text-sm">
          Namal University: free delivery on Rs {c.campus_free_threshold}+ ·
          Namal Hostel: free on Rs {c.hostel_free_threshold}+ (Rs{" "}
          {c.hostel_min_order} min order)
        </p>
        <Link
          href="/menu"
          className="shrink-0 rounded bg-black px-2.5 py-1 text-xs font-bold text-emerald-400"
        >
          Order
        </Link>
      </div>
    </div>
  );
}
