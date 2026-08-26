/** Pure helpers for catalog pull URLs — kept tiny so bandwidth logic is testable. */

export const CATALOG_PULL_AT_KEY = "catalog_pull_at";

/** Interval polls may send since=; startup / reconnect / manual / visible stay full. */
export function shouldUseIncrementalCatalogPull(reason: string): boolean {
  return reason === "interval";
}

/**
 * Whether this sync pass should refresh orders/inventory/discount-rules.
 * Intentionally ignores per-action failures: one dead/retrying item must not
 * block catalog pull when the rest of the backlog synced (or the queue is idle).
 */
export function shouldPullCatalogAfterSync(opts: {
  reason: string;
  /** At least one due action left the pending queue this pass. */
  syncedSomething: boolean;
  /** Actions that were due at the start of this pass. */
  dueCount: number;
}): boolean {
  const { reason, syncedSomething, dueCount } = opts;
  if (reason === "manual") return true;
  const catalogReasons =
    reason === "startup" ||
    reason === "online" ||
    reason === "visible" ||
    reason === "interval";
  if (!catalogReasons) return false;
  // Progress or idle due-list — never gated on sibling action failures.
  return syncedSomething || dueCount === 0;
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
