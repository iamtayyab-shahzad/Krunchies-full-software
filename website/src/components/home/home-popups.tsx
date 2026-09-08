"use client";

import { useEffect, useState } from "react";
import { OfferPopup } from "@/components/home/offer-popup";
import { NamalOfferPopup } from "@/components/home/namal-offer-popup";
import { getSettings } from "@/services/api";
import { parseNamalDeliveryConfig } from "@/lib/namal-delivery";

/** Prefer Namal student offer popup when that promo is on; otherwise deals popup. */
export function HomePopups() {
  const [mode, setMode] = useState<"loading" | "namal" | "offer">("loading");

  useEffect(() => {
    let active = true;
    getSettings()
      .then((s) => {
        if (!active) return;
        const cfg = parseNamalDeliveryConfig(s.namal_delivery);
        setMode(cfg.enabled ? "namal" : "offer");
      })
      .catch(() => {
        if (active) setMode("offer");
      });
    return () => {
      active = false;
    };
  }, []);

  if (mode === "loading") return null;
  if (mode === "namal") return <NamalOfferPopup />;
  return <OfferPopup />;
}
