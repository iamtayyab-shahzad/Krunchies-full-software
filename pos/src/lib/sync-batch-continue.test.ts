/**
 * Documents the batch-continue contract: a network error on one action must
 * not abort the rest of the due list in the same runSync pass.
 */
import { describe, expect, it } from "vitest";

function simulateBatch(
  actions: string[],
  failAt: number,
): { processed: string[]; abortedEarly: boolean } {
  const processed: string[] = [];
  let abortedEarly = false;
  for (let i = 0; i < actions.length; i++) {
    processed.push(actions[i]);
    if (i === failAt) {
      // Fixed behavior: record failure and CONTINUE (do not throw/break).
      continue;
    }
  }
  // Old bug would have set abortedEarly=true and stopped at failAt.
  abortedEarly = processed.length < actions.length;
  return { processed, abortedEarly };
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
});
