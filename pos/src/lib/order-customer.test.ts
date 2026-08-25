import { describe, expect, it } from "vitest";
import { sanitizeOrderCustomerName } from "./order-customer";

describe("sanitizeOrderCustomerName", () => {
  it("keeps a real name", () => {
    expect(sanitizeOrderCustomerName("Ali", "phone")).toBe("Ali");
    expect(sanitizeOrderCustomerName("  Ali  ", "walkin")).toBe("Ali");
  });

  it("fills Walk-in Customer for blank walk-in", () => {
    expect(sanitizeOrderCustomerName("", "walkin")).toBe("Walk-in Customer");
    expect(sanitizeOrderCustomerName("   ", "walkin")).toBe("Walk-in Customer");
    expect(sanitizeOrderCustomerName(null, "walkin")).toBe("Walk-in Customer");
  });

  it("fills Customer for blank phone/website so sync is not rejected", () => {
    expect(sanitizeOrderCustomerName("", "phone")).toBe("Customer");
    expect(sanitizeOrderCustomerName(undefined, "website")).toBe("Customer");
  });
});
