"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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

/** Compact Namal free-delivery popup (not full-screen). */
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

  const campusFrom = displayTimeLabel(cfg.campus_order_start);
  const campusUntil = displayTimeLabel(cfg.campus_order_end);
  const hostelFrom = displayTimeLabel(cfg.hostel_order_start);
  const hostelUntil = displayTimeLabel(cfg.hostel_order_end);
  const campusSlot = `${displayTimeLabel(cfg.campus_delivery_start_mon_thu)}–${displayTimeLabel(cfg.campus_delivery_end_mon_thu)}`;
  const campusFriSlot = `${displayTimeLabel(cfg.campus_delivery_start_fri)}–${displayTimeLabel(cfg.campus_delivery_end_fri)}`;
  const hostelSlot = `${displayTimeLabel(cfg.hostel_delivery_start)}–${displayTimeLabel(cfg.hostel_delivery_end)}`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showClose={false}
        className={
          // Center on mobile too (default DialogContent is a bottom sheet).
          "left-1/2 top-1/2 bottom-auto right-auto max-h-[min(85dvh,560px)] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-0 overflow-hidden rounded-xl p-0 sm:w-[calc(100%-2rem)]"
        }
      >
        <div className="relative bg-orange-500 px-4 pb-3 pt-4 pr-14 sm:px-5">
          <DialogClose
            type="button"
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-md hover:bg-zinc-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </DialogClose>
          <DialogHeader className="space-y-1 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-black/70">
              Namal students
            </p>
            <DialogTitle className="font-display text-xl leading-snug text-black sm:text-2xl">
              Free campus &amp; hostel delivery
            </DialogTitle>
            <DialogDescription className="text-sm text-black/75">
              Place your order in the window below and we deliver free in that
              day’s slot. Need it sooner? Choose{" "}
              <strong>Deliver now</strong> (paid).
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[min(42dvh,280px)] space-y-2.5 overflow-y-auto px-4 py-3 sm:px-5">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2.5">
            <p className="text-sm font-semibold text-orange-400">Campus</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-300">
              Order from <strong className="text-white">{campusFrom}</strong> to{" "}
              <strong className="text-white">{campusUntil}</strong>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              → Free delivery Mon–Thu{" "}
              <strong className="text-zinc-200">{campusSlot}</strong>
              <br />
              → Free delivery Fri{" "}
              <strong className="text-zinc-200">{campusFriSlot}</strong>
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2.5">
            <p className="text-sm font-semibold text-orange-400">Hostel</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-300">
              Order from <strong className="text-white">{hostelFrom}</strong> to{" "}
              <strong className="text-white">{hostelUntil}</strong>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              → Free delivery every day{" "}
              <strong className="text-zinc-200">{hostelSlot}</strong>
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t border-zinc-800 px-4 py-3 sm:px-5">
          <Button
            asChild
            className="min-h-11 w-full font-bold"
            onClick={() => handleClose(false)}
          >
            <Link href="/menu">Order free delivery</Link>
          </Button>
          <button
            type="button"
            className="w-full py-2 text-center text-sm text-zinc-400 hover:text-white"
            onClick={() => handleClose(false)}
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
