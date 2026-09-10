import type { Location } from "@/types";
import type { NamalDeliveryConfig } from "@/lib/namal-delivery";

const HIDDEN_CHECKOUT_NAMES = new Set(["city center"]);

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function isNamalAreaName(name: string) {
  const n = normalizeName(name);
  if (!n.includes("namal")) return false;
  return (
    n.includes("university") ||
    n.includes("campus") ||
    n.includes("hostel")
  );
}

/**
 * Locations shown on website checkout:
 * - hide City Center
 * - when Namal offer is on, keep only the configured campus/hostel rows
 *   (drops older duplicate Namal areas that show as "normal" fee only)
 */
export function filterCheckoutLocations(
  locations: Location[],
  namalCfg: NamalDeliveryConfig,
): Location[] {
  const namalIds = new Set(
    [namalCfg.campus_location_id, namalCfg.hostel_location_id].filter(Boolean),
  );

  return locations.filter((loc) => {
    const name = normalizeName(loc.name || "");
    if (HIDDEN_CHECKOUT_NAMES.has(name)) return false;

    // Hide walk-in from customer delivery picker (POS-only area).
    if (name.includes("walk-in") || name.includes("in store")) return false;

    if (isNamalAreaName(loc.name || "")) {
      if (namalCfg.enabled && namalIds.size > 0) {
        return namalIds.has(loc.id);
      }
      // Offer off: still show at most one row per Namal name (first wins below).
    }
    return true;
  }).filter((loc, index, arr) => {
    // Deduplicate remaining Namal names if offer is off or ids mismatched.
    if (!isNamalAreaName(loc.name || "")) return true;
    const first = arr.findIndex(
      (l) => normalizeName(l.name) === normalizeName(loc.name),
    );
    return first === index;
  });
}
