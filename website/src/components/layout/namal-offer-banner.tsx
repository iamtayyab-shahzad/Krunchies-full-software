"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSettings } from "@/services/api";
import {
  namalOfferSummary,
  parseNamalDeliveryConfig,
} from "@/lib/namal-delivery";

/** Compact reminder strip after the main Namal popup is dismissed. */
export function NamalOfferBanner() {
  const [text, setText] = useState("");

  useEffect(() => {
    let active = true;
    getSettings()
      .then((s) => {
        if (!active) return;
        const cfg = parseNamalDeliveryConfig(s.namal_delivery);
        setText(namalOfferSummary(cfg));
      })
      .catch(() => {
        if (active) setText("");
      });
    return () => {
      active = false;
    };
  }, []);

  if (!text) return null;

  return (
    <div className="border-b border-orange-500/50 bg-orange-500 text-black">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm font-bold sm:text-[15px]">
          Namal students: {text}
        </p>
        <Link
          href="/menu"
          className="shrink-0 rounded-md bg-black px-3 py-1.5 text-sm font-bold text-orange-400"
        >
          Order now
        </Link>
      </div>
    </div>
  );
}
