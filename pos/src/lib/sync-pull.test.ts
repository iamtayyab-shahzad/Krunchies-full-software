import { describe, expect, it } from "vitest";
import {
  buildInventoryPullUrl,
  buildOrdersPullUrl,
  shouldPullCatalogAfterSync,
  shouldUseIncrementalCatalogPull,
} from "@/lib/sync-pull";

describe("sync-pull bandwidth helpers", () => {
  it("only interval uses incremental since", () => {
    expect(shouldUseIncrementalCatalogPull("interval")).toBe(true);
    expect(shouldUseIncrementalCatalogPull("startup")).toBe(false);
    expect(shouldUseIncrementalCatalogPull("online")).toBe(false);
    expect(shouldUseIncrementalCatalogPull("manual")).toBe(false);
    expect(shouldUseIncrementalCatalogPull("visible")).toBe(false);
    expect(shouldUseIncrementalCatalogPull("enqueue")).toBe(false);
  });

  it("orders URL omits since when absent (old clients / full pull)", () => {
    expect(buildOrdersPullUrl({})).toBe("/orders?limit=200");
    expect(buildOrdersPullUrl({ since: null })).toBe("/orders?limit=200");
    expect(buildOrdersPullUrl({ since: "" })).toBe("/orders?limit=200");
  });

  it("orders URL includes since when present", () => {
    const since = "2026-08-17T05:00:00.000Z";
    expect(buildOrdersPullUrl({ since })).toBe(
      `/orders?limit=200&since=${encodeURIComponent(since)}`,
    );
  });

  it("inventory URL omits since when absent", () => {
    expect(buildInventoryPullUrl({})).toBe("/inventory");
    expect(buildInventoryPullUrl({ since: null })).toBe("/inventory");
  });

  it("inventory URL includes since when present", () => {
    const since = "2026-08-17T05:00:00.000Z";
    expect(buildInventoryPullUrl({ since })).toBe(
      `/inventory?since=${encodeURIComponent(since)}`,
    );
  });
});

describe("catalog / discount-rules pull after partial backlog failure", () => {
  /**
   * Simulates the old bug gate: `shouldRefresh && (!hadFailure || manual)`.
   * New helper must pull whenever there was real progress — hadFailure ignored.
   */
  function oldGate(opts: {
    reason: string;
    syncedSomething: boolean;
    dueCount: number;
    hadFailure: boolean;
  }) {
    const shouldRefresh =
      opts.reason === "manual" ||
      opts.reason === "startup" ||
      opts.reason === "online" ||
      opts.reason === "visible" ||
      (opts.reason === "interval" &&
        (opts.syncedSomething || opts.dueCount === 0));
    return shouldRefresh && (!opts.hadFailure || opts.reason === "manual");
  }

  it("pulls discount-rules when one action fails but others sync (interval)", () => {
    const opts = {
      reason: "interval",
      syncedSomething: true,
      dueCount: 22,
      hadFailure: true,
    };
    expect(oldGate(opts)).toBe(false); // regression baseline
    expect(
      shouldPullCatalogAfterSync({
        reason: opts.reason,
        syncedSomething: opts.syncedSomething,
        dueCount: opts.dueCount,
      }),
    ).toBe(true);
  });

  it("pulls on startup/online/visible after partial success despite failures", () => {
    for (const reason of ["startup", "online", "visible"] as const) {
      expect(
        shouldPullCatalogAfterSync({
          reason,
          syncedSomething: true,
          dueCount: 10,
        }),
      ).toBe(true);
      expect(
        oldGate({
          reason,
          syncedSomething: true,
          dueCount: 10,
          hadFailure: true,
        }),
      ).toBe(false);
    }
  });

  it("still pulls when due queue is empty (idle interval)", () => {
    expect(
      shouldPullCatalogAfterSync({
        reason: "interval",
        syncedSomething: false,
        dueCount: 0,
      }),
    ).toBe(true);
  });

  it("manual always pulls", () => {
    expect(
      shouldPullCatalogAfterSync({
        reason: "manual",
        syncedSomething: false,
        dueCount: 5,
      }),
    ).toBe(true);
  });

  it("enqueue/drain stay push-only (no catalog pull)", () => {
    expect(
      shouldPullCatalogAfterSync({
        reason: "enqueue",
        syncedSomething: true,
        dueCount: 3,
      }),
    ).toBe(false);
    expect(
      shouldPullCatalogAfterSync({
        reason: "drain",
        syncedSomething: true,
        dueCount: 3,
      }),
    ).toBe(false);
  });

  it("does not pull on interval when nothing synced and work remains due", () => {
    expect(
      shouldPullCatalogAfterSync({
        reason: "interval",
        syncedSomething: false,
        dueCount: 5,
      }),
    ).toBe(false);
  });
});
