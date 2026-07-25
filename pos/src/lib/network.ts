/** Network helpers for offline-first POS. */

import { ApiError } from "@/lib/api-client";

export function isOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function isNetworkError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  if ("status" in err && (err as { status?: number }).status === 0) {
    return true;
  }
  if (err instanceof Error) {
    return /network|failed to fetch|unavailable/i.test(err.message);
  }
  return false;
}

/** Errors that should queue writes instead of failing the cashier. */
export function isQueueableError(err: unknown) {
  if (isNetworkError(err) || !isOnline()) return true;
  if (err instanceof ApiError) {
    return [0, 408, 429, 502, 503, 504].includes(err.status);
  }
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status?: number }).status;
    return typeof status === "number" && [0, 408, 429, 502, 503, 504].includes(status);
  }
  return false;
}

/** Client validation / permanent failures — do not keep retrying forever. */
export function isPermanentSyncError(err: unknown) {
  if (!(err instanceof ApiError)) return false;
  if ([401, 429].includes(err.status)) return false;
  return err.status >= 400 && err.status < 500;
}
