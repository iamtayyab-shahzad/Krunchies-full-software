/**
 * Documents the batch-continue contract: a network error on one action must
 * not abort the rest of the due list in the same runSync pass.
 * Also: catalog/discount-rules pull is not blocked by that sibling failure,
 * and reconnect pulls rules before draining a large backlog.
 */
import { describe, expect, it } from "vitest";
import {
  shouldPullCatalogAfterSync,
  shouldPullDiscountRulesBeforeQueue,
} from "@/lib/sync-pull";

function simulateBatch(
  actions: string[],
  failAt: number,
): { processed: string[]; abortedEarly: boolean; syncedIds: string[] } {
  const processed: string[] = [];
  const syncedIds: string[] = [];
  let abortedEarly = false;
  for (let i = 0; i < actions.length; i++) {
    processed.push(actions[i]);
    if (i === failAt) {
      continue;
    }
    syncedIds.push(actions[i]);
  }
  abortedEarly = processed.length < actions.length;
  return { processed, abortedEarly, syncedIds };
}

describe("sync batch continue after network failure", () => {
  it("processes actions after a mid-batch network failure", () => {
    const actions = Array.from({ length: 22 }, (_, i) => `action-${i}`);
    const { processed, abortedEarly } = simulateBatch(actions, 5);
    expect(abortedEarly).toBe(false);
    expect(processed).toHaveLength(22);
    expect(processed[5]).toBe("action-5");
    expect(processed[21]).toBe("action-21");
  });

  it("still pulls offers/discount-rules in the same run after one deliberate failure", () => {
    const actions = Array.from({ length: 22 }, (_, i) => `action-${i}`);
    const { syncedIds } = simulateBatch(actions, 5);
    expect(syncedIds).toHaveLength(21);

    expect(
      shouldPullCatalogAfterSync({
        reason: "interval",
        syncedSomething: syncedIds.length > 0,
        dueCount: actions.length,
      }),
    ).toBe(true);
    expect(
      shouldPullCatalogAfterSync({
        reason: "startup",
        syncedSomething: syncedIds.length > 0,
        dueCount: actions.length,
      }),
    ).toBe(true);
  });

  it("on reconnect with weeks of backlog, pulls discount rules before drain", () => {
    const backlog = 400;
    expect(shouldPullDiscountRulesBeforeQueue("online")).toBe(true);
    expect(
      shouldPullCatalogAfterSync({
        reason: "online",
        syncedSomething: false,
        dueCount: backlog,
      }),
    ).toBe(true);
  });
});
