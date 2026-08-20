import { describe, expect, it } from "vitest";
import {
  isOfflineSessionValid,
  isTillSessionValid,
  OFFLINE_SESSION_GRACE_MS,
} from "./utils";

describe("isTillSessionValid", () => {
  it("rejects empty session", () => {
    expect(isTillSessionValid(null)).toBe(false);
    expect(isTillSessionValid({ token: "" })).toBe(false);
  });

  it("accepts unexpired JWT", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    expect(
      isTillSessionValid({ token: "t", exp, saved_at: new Date().toISOString() }),
    ).toBe(true);
  });

  it("local shop keeps expired JWT until Logout", () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    const session = {
      token: "t",
      exp,
      saved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    };
    expect(isTillSessionValid(session, { localShop: true })).toBe(true);
    expect(isTillSessionValid(session, { localShop: false })).toBe(true);
  });

  it("cloud rejects session older than grace after JWT expiry", () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    const session = {
      token: "t",
      exp,
      saved_at: new Date(
        Date.now() - OFFLINE_SESSION_GRACE_MS - 60_000,
      ).toISOString(),
    };
    expect(isTillSessionValid(session, { localShop: false })).toBe(false);
    expect(isTillSessionValid(session, { localShop: true })).toBe(true);
    expect(isOfflineSessionValid(session)).toBe(false);
  });
});
