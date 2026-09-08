/**
 * Namal University free scheduled delivery — Asia/Karachi, same-day only.
 */

import { getKarachiMinutesNow, PK_TIMEZONE } from "@/lib/shop-hours";

export type NamalDeliveryConfig = {
  enabled: boolean;
  campus_location_id: string;
  hostel_location_id: string;
  campus_order_start: string;
  campus_order_end: string;
  campus_delivery_start_mon_thu: string;
  campus_delivery_end_mon_thu: string;
  campus_delivery_start_fri: string;
  campus_delivery_end_fri: string;
  hostel_order_start: string;
  hostel_order_end: string;
  hostel_delivery_start: string;
  hostel_delivery_end: string;
};

export const DEFAULT_NAMAL_CONFIG: NamalDeliveryConfig = {
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

export type NamalSite = "campus" | "hostel" | null;

export type NamalSlotStatus = {
  enabled: boolean;
  site: NamalSite;
  freeSlotAvailable: boolean;
  slotLabel: string;
  hint: string;
};

export function parseNamalDeliveryConfig(raw?: string | null): NamalDeliveryConfig {
  if (!raw?.trim()) return { ...DEFAULT_NAMAL_CONFIG };
  try {
    return { ...DEFAULT_NAMAL_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NAMAL_CONFIG };
  }
}

function parseHHMM(s: string): number | null {
  const m = String(s || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function displayHHMM(s: string): string {
  const mins = parseHHMM(s);
  if (mins == null) return s;
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}

/** Public helper for UI labels (e.g. offer popup). */
export function displayTimeLabel(s: string): string {
  return displayHHMM(s);
}

function formatRange(start: string, end: string): string {
  return `${displayHHMM(start)}–${displayHHMM(end)}`;
}

function karachiWeekday(now = new Date()): number {
  // 0=Sun … 6=Sat
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: PK_TIMEZONE,
    weekday: "short",
  }).format(now);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 0;
}

export function namalSiteForLocation(
  cfg: NamalDeliveryConfig,
  locationId: string,
): NamalSite {
  if (!locationId) return null;
  if (locationId === cfg.campus_location_id) return "campus";
  if (locationId === cfg.hostel_location_id) return "hostel";
  return null;
}

export function evaluateNamalSlot(
  cfg: NamalDeliveryConfig,
  locationId: string,
  now = new Date(),
): NamalSlotStatus {
  const site = namalSiteForLocation(cfg, locationId);
  if (!cfg.enabled) {
    return {
      enabled: false,
      site,
      freeSlotAvailable: false,
      slotLabel: "",
      hint: "",
    };
  }
  if (!site) {
    return {
      enabled: true,
      site: null,
      freeSlotAvailable: false,
      slotLabel: "",
      hint: "Choose Namal University or Namal Hostel for free scheduled delivery.",
    };
  }

  const nowMin = getKarachiMinutesNow(now);
  const weekday = karachiWeekday(now);

  if (site === "campus") {
    if (weekday < 1 || weekday > 5) {
      return {
        enabled: true,
        site,
        freeSlotAvailable: false,
        slotLabel: "",
        hint: "Campus free delivery runs Monday–Friday only. You can still choose Deliver now with a delivery fee.",
      };
    }
    const start = parseHHMM(cfg.campus_order_start);
    const end = parseHHMM(cfg.campus_order_end);
    if (start == null || end == null) {
      return {
        enabled: true,
        site,
        freeSlotAvailable: false,
        slotLabel: "",
        hint: "Campus free slot is unavailable.",
      };
    }
    const fri = weekday === 5;
    const delStart = fri
      ? cfg.campus_delivery_start_fri
      : cfg.campus_delivery_start_mon_thu;
    const delEnd = fri
      ? cfg.campus_delivery_end_fri
      : cfg.campus_delivery_end_mon_thu;
    const label = formatRange(delStart, delEnd);
    if (nowMin >= start && nowMin <= end) {
      return {
        enabled: true,
        site,
        freeSlotAvailable: true,
        slotLabel: label,
        hint: `Free delivery today ${label}. Order by ${displayHHMM(cfg.campus_order_end)}.`,
      };
    }
    return {
      enabled: true,
      site,
      freeSlotAvailable: false,
      slotLabel: "",
      hint: `Campus free slot closed for today (order ${displayHHMM(cfg.campus_order_start)}–${displayHHMM(cfg.campus_order_end)}). Deliver now is still available.`,
    };
  }

  // hostel
  const start = parseHHMM(cfg.hostel_order_start);
  const end = parseHHMM(cfg.hostel_order_end);
  if (start == null || end == null) {
    return {
      enabled: true,
      site,
      freeSlotAvailable: false,
      slotLabel: "",
      hint: "Hostel free slot is unavailable.",
    };
  }
  const label = formatRange(cfg.hostel_delivery_start, cfg.hostel_delivery_end);
  if (nowMin >= start && nowMin <= end) {
    return {
      enabled: true,
      site,
      freeSlotAvailable: true,
      slotLabel: label,
      hint: `Free hostel delivery tonight ${label}. Order by ${displayHHMM(cfg.hostel_order_end)}.`,
    };
  }
  return {
    enabled: true,
    site,
    freeSlotAvailable: false,
    slotLabel: "",
    hint: `Hostel free slot closed for today (order until ${displayHHMM(cfg.hostel_order_end)}). Deliver now is still available.`,
  };
}

export function namalOfferSummary(cfg: NamalDeliveryConfig): string {
  if (!cfg.enabled) return "";
  return `Free campus & hostel delivery in time windows — or Deliver now anytime (paid).`;
}
