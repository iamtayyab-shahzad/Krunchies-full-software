/**
 * Lightweight window events used to keep the UI in sync with local
 * (IndexedDB) mutations that happen while offline, before the sync engine
 * runs. React Query listeners invalidate the relevant caches so the
 * Pending/History views refresh from IndexedDB immediately.
 */
export const POS_ORDERS_CHANGED_EVENT = "pos-orders-changed";

export function notifyOrdersChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(POS_ORDERS_CHANGED_EVENT));
}
