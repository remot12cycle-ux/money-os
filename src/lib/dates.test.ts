import { describe, expect, it } from "vitest";
import { monthLabel, monthRange, periodOf, daysLeftInMonth, monthParam } from "./dates";

describe("finance periods", () => {
  it("calendar month when start day is 1", () => {
    expect(monthRange("2026-02", 1)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthLabel("2026-10", 1)).toBe("October 2026");
  });
  it("custom start day spans two calendar months", () => {
    expect(monthRange("2026-10", 25)).toEqual({ from: "2026-10-25", to: "2026-11-24" });
    expect(monthRange("2026-12", 25)).toEqual({ from: "2026-12-25", to: "2027-01-24" });
    expect(monthRange("2027-01", 28)).toEqual({ from: "2027-01-28", to: "2027-02-27" });
    expect(monthLabel("2026-10", 25)).toBe("25 Oct – 24 Nov 2026");
    expect(monthLabel("2026-12", 25)).toBe("25 Dec 2026 – 24 Jan 2027");
  });
  it("periodOf picks the period that contains the day", () => {
    expect(periodOf(new Date(2026, 9, 24), 25)).toBe("2026-09");
    expect(periodOf(new Date(2026, 9, 25), 25)).toBe("2026-10");
    expect(periodOf(new Date(2026, 0, 3), 25)).toBe("2025-12");
    expect(periodOf(new Date(2026, 9, 1), 1)).toBe("2026-10");
  });
  it("clamps the start day", () => {
    expect(monthRange("2026-02", 31)).toEqual({ from: "2026-02-28", to: "2026-03-27" });
  });
  it("past periods have no days left; bad params fall back", () => {
    expect(daysLeftInMonth("2020-01", 1)).toBe(0);
    expect(monthParam("2026-13", 1)).toMatch(/^\d{4}-\d{2}$/);
    expect(monthParam("2026-07", 1)).toBe("2026-07");
  });
});
