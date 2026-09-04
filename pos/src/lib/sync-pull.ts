/** Pure helpers for catalog pull URLs — kept tiny so bandwidth logic is testable. */

export const CATALOG_PULL_AT_KEY = "catalog_pull_at";

/** Interval polls may send since=; startup / reconnect / manual / visible stay full. */
export function shouldUseIncrementalCatalogPull(reason: string): boolean {
  return reason === "interval";
}

/**
 * Pull discount rules BEFORE draining a large offline backlog.
 * Weeks of waiting CREATE/COMPLETE must not delay offer updates on reconnect.
 */
export function shouldPullDiscountRulesBeforeQueue(reason: string): boolean {
  return (
    reason === "manual" ||
    reason === "startup" ||
    reason === "online" ||
    reason === "visible"
  );
}

/**
 * Whether this sync pass should refresh orders/inventory/discount-rules
 * after the queue drain. Intentionally ignores per-action failures.
 */
export function shouldPullCatalogAfterSync(opts: {
  reason: string;
  /** At least one due action left the pending queue this pass. */
  syncedSomething: boolean;
  /** Actions that were due at the start of this pass. */
  dueCount: number;
}): boolean {
  const { reason, syncedSomething, dueCount } = opts;
  // Reconnect / focus / manual: always refresh after the pass (rules also
  // pulled earlier via shouldPullDiscountRulesBeforeQueue).
  if (
    reason === "manual" ||
    reason === "startup" ||
    reason === "online" ||
    reason === "visible"
  ) {
    return true;
  }
  if (reason === "interval") {
    // Progress or idle — never gated on sibling action failures.
    return syncedSomething || dueCount === 0;
  }
  return false;
}

export function buildOrdersPullUrl(opts: {
  since?: string | null;
  limit?: number;
}): string {
  const limit = opts.limit ?? 200;
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (opts.since) params.set("since", opts.since);
  return `/orders?${params.toString()}`;
}

export function buildInventoryPullUrl(opts: { since?: string | null }): string {
  if (!opts.since) return "/inventory";
  return `/inventory?since=${encodeURIComponent(opts.since)}`;
}
