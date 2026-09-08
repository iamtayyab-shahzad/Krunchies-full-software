"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSettings } from "@/services/api";
import { parseNamalDeliveryConfig } from "@/lib/namal-delivery";

/** Single compact strip — no stacked open/offer bars. */
export function NamalOfferBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((s) => {
        if (!active) return;
        const cfg = parseNamalDeliveryConfig(s.namal_delivery);
        setShow(cfg.enabled);
      })
      .catch(() => {
        if (active) setShow(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!show) return null;

  return (
    <div className="border-b border-orange-600/40 bg-orange-500">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-1.5 sm:px-6 lg:px-8">
        <p className="min-w-0 truncate text-xs font-bold text-black sm:text-sm">
          Namal: free campus &amp; hostel slots · or Deliver now (paid)
        </p>
        <Link
          href="/menu"
          className="shrink-0 rounded bg-black px-2.5 py-1 text-xs font-bold text-orange-400"
        >
          Order
        </Link>
      </div>
    </div>
  );
}
