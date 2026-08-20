import { describe, expect, it } from "vitest";
import { isCloudPos, isLocalShopPos } from "./pos-mode";

describe("isLocalShopPos", () => {
  it("treats shop shortcut hosts as local", () => {
    expect(isLocalShopPos("127.0.0.1")).toBe(true);
    expect(isLocalShopPos("localhost")).toBe(true);
    expect(isLocalShopPos("LOCALHOST")).toBe(true);
    expect(isLocalShopPos("[::1]")).toBe(true);
  });

  it("treats Vercel / public hosts as cloud (password required)", () => {
    expect(isLocalShopPos("krunchies-pos.vercel.app")).toBe(false);
    expect(isLocalShopPos("pos.krunchies.pk")).toBe(false);
    expect(isLocalShopPos("")).toBe(false);
    expect(isLocalShopPos(null)).toBe(false);
  });
});

describe("isCloudPos", () => {
  it("is the inverse of local", () => {
    expect(isCloudPos("127.0.0.1")).toBe(false);
    expect(isCloudPos("krunchies-pos.vercel.app")).toBe(true);
  });
});
