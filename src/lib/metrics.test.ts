import { describe, expect, it } from "vitest";
import { available, balanceSeries, growth, pnl, targetProgress, type TxLite } from "./metrics";

const tx = (type: TxLite["type"], amount_base: number, occurred_on = "2026-10-01"): TxLite => ({
  type,
  amount_base,
  entity_id: "e1",
  occurred_on,
});

describe("metrics", () => {
  it("computes P&L and margin", () => {
    const p = pnl([tx("income", 1000), tx("expense", 250), tx("transfer", 999)]);
    expect(p).toEqual({ income: 1000, expenses: 250, net: 750, margin: 0.75 });
  });

  it("ignores opening-balance rows in P&L", () => {
    const p = pnl([{ ...tx("income", 5000), source: "opening" }, tx("income", 100)]);
    expect(p.income).toBe(100);
  });

  it("available subtracts committed", () => {
    expect(available(5000, 1200.5)).toBe(3799.5);
  });

  it("target progress for net profit and revenue", () => {
    const p = pnl([tx("income", 3000), tx("expense", 1000)]);
    expect(targetProgress(p, 4000, "net_profit")).toEqual({ value: 2000, ratio: 0.5, remaining: 2000 });
    expect(targetProgress(p, 2000, "revenue")).toEqual({ value: 3000, ratio: 1.5, remaining: 0 });
  });

  it("growth vs starting capital", () => {
    expect(growth(6000, 5000)).toEqual({ delta: 1000, ratio: 0.2 });
    expect(growth(4000, 5000).ratio).toBeCloseTo(-0.2);
  });

  it("builds a cumulative balance series", () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-03"];
    const s = balanceSeries(
      [tx("income", 100, "2026-09-30"), tx("expense", 20, "2026-10-02"), tx("income", 5, "2026-10-03")],
      5000,
      days,
    );
    expect(s.map((p) => p.value)).toEqual([5100, 5080, 5085]);
  });
});
