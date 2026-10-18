import { describe, expect, it } from "vitest";
import { convert, formatMoney, rateToBase, round2, sum } from "./money";

describe("money", () => {
  it("rounds to 2dp without float drift", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
  });

  it("sums exactly in cents", () => {
    expect(sum([0.1, 0.2, 0.3])).toBe(0.6);
    expect(sum([19.99, 0.01])).toBe(20);
  });

  it("converts between USD and MAD", () => {
    expect(convert(100, "USD", "MAD", 10)).toBe(1000);
    expect(convert(1000, "MAD", "USD", 10)).toBe(100);
    expect(convert(55.5, "USD", "USD", 10)).toBe(55.5);
  });

  it("gives the right multiplier to base", () => {
    expect(rateToBase("USD", "USD", 10)).toBe(1);
    expect(rateToBase("MAD", "USD", 10)).toBeCloseTo(0.1);
    expect(rateToBase("USD", "MAD", 10)).toBe(10);
  });

  it("formats with explicit sign and currency", () => {
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
    expect(formatMoney(1234.5, "USD", { sign: true })).toBe("+$1,234.50");
    expect(formatMoney(-20, "USD")).toBe("−$20.00");
    expect(formatMoney(5000, "USD", { compactDecimals: true })).toBe("$5,000");
    expect(formatMoney(2500, "MAD")).toBe("2,500.00 MAD");
    expect(formatMoney(12400, "USD", { abbreviate: true })).toBe("$12.4k");
  });
});
