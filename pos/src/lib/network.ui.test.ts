import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiTimeoutMs,
  beginCatchupTimeoutBudget,
  clearForcedOffline,
  endCatchupTimeoutBudget,
  isOnline,
  isUiOnline,
  markUnreachable,
} from "./network";

describe("UI online vs circuit breaker", () => {
  beforeEach(() => {
    clearForcedOffline();
    endCatchupTimeoutBudget();
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    clearForcedOffline();
    endCatchupTimeoutBudget();
    vi.unstubAllGlobals();
  });

  it("keeps UI online during API cooldown while browser is online", () => {
    expect(isUiOnline()).toBe(true);
    expect(isOnline()).toBe(true);
    markUnreachable();
    expect(isOnline()).toBe(false);
    expect(isUiOnline()).toBe(true);
  });

  it("shows UI offline only when navigator reports offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(isUiOnline()).toBe(false);
    expect(isOnline()).toBe(false);
  });

  it("uses a longer timeout budget during catch-up sync", () => {
    expect(apiTimeoutMs()).toBeLessThan(45_000);
    beginCatchupTimeoutBudget();
    expect(apiTimeoutMs()).toBe(45_000);
    endCatchupTimeoutBudget();
    expect(apiTimeoutMs()).toBeLessThan(45_000);
  });
});
