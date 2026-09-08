"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSettings } from "@/services/api";
import {
  namalOfferSummary,
  parseNamalDeliveryConfig,
} from "@/lib/namal-delivery";

/** Prominent strip so Namal students notice free scheduled delivery. */
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
    <div className="border-b border-orange-500/40 bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-orange-100 sm:text-[15px]">
          <span className="font-bold text-orange-400">Namal students — </span>
          {text}
        </p>
        <Link
          href="/checkout"
          className="shrink-0 text-sm font-bold text-orange-400 underline-offset-2 hover:underline"
        >
          Order now →
        </Link>
      </div>
    </div>
  );
}
