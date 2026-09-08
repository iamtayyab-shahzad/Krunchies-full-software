"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSettings } from "@/services/api";
import {
  displayTimeLabel,
  parseNamalDeliveryConfig,
  type NamalDeliveryConfig,
} from "@/lib/namal-delivery";

const DISMISS_KEY = "krunchies_namal_offer_dismissed";

/** Full-screen style popup so Namal students notice free delivery. */
export function NamalOfferPopup() {
  const [cfg, setCfg] = useState<NamalDeliveryConfig | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* ignore */
    }

    getSettings()
      .then((s) => {
        if (!active) return;
        const parsed = parseNamalDeliveryConfig(s.namal_delivery);
        if (!parsed.enabled) return;
        setCfg(parsed);
        window.setTimeout(() => {
          if (active) setOpen(true);
        }, 600);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const handleClose = (value: boolean) => {
    setOpen(value);
    if (!value) {
      try {
        sessionStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  };

  if (!cfg?.enabled) return null;

  const campusUntil = displayTimeLabel(cfg.campus_order_end);
  const hostelUntil = displayTimeLabel(cfg.hostel_order_end);
  const campusSlot = `${displayTimeLabel(cfg.campus_delivery_start_mon_thu)}–${displayTimeLabel(cfg.campus_delivery_end_mon_thu)}`;
  const campusFriSlot = `${displayTimeLabel(cfg.campus_delivery_start_fri)}–${displayTimeLabel(cfg.campus_delivery_end_fri)}`;
  const hostelSlot = `${displayTimeLabel(cfg.hostel_delivery_start)}–${displayTimeLabel(cfg.hostel_delivery_end)}`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="inset-x-3 bottom-auto top-[50%] max-h-[90dvh] w-auto max-w-lg translate-y-[-50%] overflow-y-auto rounded-2xl border-orange-500/50 bg-zinc-950 p-0 shadow-[0_0_60px_rgba(249,115,22,0.35)] sm:inset-x-auto">
        <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 px-5 py-6 text-center sm:px-8 sm:py-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/70">
            Namal University students
          </p>
          <DialogHeader className="space-y-2">
            <DialogTitle className="font-display text-3xl leading-tight text-black sm:text-4xl">
              Free delivery to campus &amp; hostel
            </DialogTitle>
            <DialogDescription className="text-base text-black/80">
              Order in advance for a free batch delivery — or choose{" "}
              <strong>Deliver now</strong> anytime (paid).
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-8 sm:py-6">
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
            <p className="font-bold text-orange-300">Namal University (campus)</p>
            <p className="mt-1 text-sm text-zinc-300">
              Order by {campusUntil} · Free delivery Mon–Thu {campusSlot}, Fri{" "}
              {campusFriSlot}
            </p>
          </div>
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
            <p className="font-bold text-orange-300">Namal Hostel</p>
            <p className="mt-1 text-sm text-zinc-300">
              Order by {hostelUntil} · Free delivery every day {hostelSlot}
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              At checkout choose <span className="text-orange-400">Deliver now</span>{" "}
              or <span className="text-emerald-400">Free delivery</span>
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              asChild
              className="min-h-12 flex-1 text-base font-bold"
              onClick={() => handleClose(false)}
            >
              <Link href="/menu">Order free delivery</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-12 flex-1 border-zinc-600"
              onClick={() => handleClose(false)}
            >
              <Link href="/checkout">Go to checkout</Link>
            </Button>
          </div>
          <button
            type="button"
            className="w-full py-2 text-center text-sm text-zinc-500 hover:text-zinc-300"
            onClick={() => handleClose(false)}
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
