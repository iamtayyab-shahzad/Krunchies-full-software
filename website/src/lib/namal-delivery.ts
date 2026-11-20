/**
 * Namal University / Namal Hostel delivery rules — amount-based, no time
 * windows:
 * - Campus: free delivery once the cart reaches campus_free_threshold.
 * - Hostel: orders below hostel_min_order are blocked; free delivery once
 *   the cart reaches hostel_free_threshold; normal fee in between.
 */

export type NamalDeliveryConfig = {
  enabled: boolean;
  campus_location_id: string;
  hostel_location_id: string;
  campus_free_threshold: number;
  hostel_min_order: number;
  hostel_free_threshold: number;
};

export const DEFAULT_NAMAL_CONFIG: NamalDeliveryConfig = {
  enabled: false,
  campus_location_id: "50000000-0000-4000-8000-000000000004",
  hostel_location_id: "50000000-0000-4000-8000-000000000005",
  campus_free_threshold: 2000,
  hostel_min_order: 1500,
  hostel_free_threshold: 5000,
};

export type NamalSite = "campus" | "hostel" | null;

export type NamalDeliveryStatus = {
  enabled: boolean;
  site: NamalSite;
  /** true once the cart qualifies for free delivery at this location. */
  freeDelivery: boolean;
  /** true when the cart is below the hostel minimum and cannot be placed. */
  blocked: boolean;
  /** Customer-facing message: progress toward free delivery, or the block reason. */
  message: string;
};

export function parseNamalDeliveryConfig(
  raw?: string | null,
): NamalDeliveryConfig {
  if (!raw?.trim()) return { ...DEFAULT_NAMAL_CONFIG };
  try {
    return { ...DEFAULT_NAMAL_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NAMAL_CONFIG };
  }
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

/**
 * Evaluates the Namal delivery rules for the current cart subtotal (Rs,
 * before delivery charge/discount) at the selected location.
 */
export function evaluateNamalDelivery(
  cfg: NamalDeliveryConfig,
  locationId: string,
  subtotal: number,
): NamalDeliveryStatus {
  const site = namalSiteForLocation(cfg, locationId);
  if (!cfg.enabled || !site) {
    return { enabled: cfg.enabled, site, freeDelivery: false, blocked: false, message: "" };
  }

  if (site === "campus") {
    if (subtotal >= cfg.campus_free_threshold) {
      return {
        enabled: true,
        site,
        freeDelivery: true,
        blocked: false,
        message: "Free delivery — your order qualifies!",
      };
    }
    const remaining = cfg.campus_free_threshold - subtotal;
    return {
      enabled: true,
      site,
      freeDelivery: false,
      blocked: false,
      message: `Add Rs ${remaining} more to get FREE delivery (free on orders of Rs ${cfg.campus_free_threshold}+ from Namal University).`,
    };
  }

  // hostel
  if (subtotal < cfg.hostel_min_order) {
    const remaining = cfg.hostel_min_order - subtotal;
    return {
      enabled: true,
      site,
      freeDelivery: false,
      blocked: true,
      message: `Minimum order for Namal Hostel is Rs ${cfg.hostel_min_order}. Please add Rs ${remaining} more to place this order.`,
    };
  }
  if (subtotal >= cfg.hostel_free_threshold) {
    return {
      enabled: true,
      site,
      freeDelivery: true,
      blocked: false,
      message: "Free delivery — your order qualifies!",
    };
  }
  const remaining = cfg.hostel_free_threshold - subtotal;
  return {
    enabled: true,
    site,
    freeDelivery: false,
    blocked: false,
    message: `Add Rs ${remaining} more to get FREE delivery (free on orders of Rs ${cfg.hostel_free_threshold}+ from Namal Hostel).`,
  };
}

export function namalOfferSummary(cfg: NamalDeliveryConfig): string {
  if (!cfg.enabled) return "";
  return `Free delivery: Namal University on orders of Rs ${cfg.campus_free_threshold}+, Namal Hostel on orders of Rs ${cfg.hostel_free_threshold}+ (Rs ${cfg.hostel_min_order} minimum order from the hostel).`;
}
