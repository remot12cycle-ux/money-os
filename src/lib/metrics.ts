/**
 * Pure derivations used by the dashboard, businesses and goals screens.
 * Everything here receives already-converted base-currency amounts.
 */

export type TxLite = {
  type: "income" | "expense" | "transfer";
  amount_base: number;
  entity_id: string | null;
  occurred_on: string; // yyyy-mm-dd
};

export type Pnl = { income: number; expenses: number; net: number; margin: number };

export function pnl(txs: Iterable<TxLite>): Pnl {
  let income = 0;
  let expenses = 0;
  for (const t of txs) {
    if (t.type === "income") income += t.amount_base;
    else if (t.type === "expense") expenses += t.amount_base;
  }
  const net = +(income - expenses).toFixed(2);
  const margin = income > 0 ? net / income : 0;
  return { income: +income.toFixed(2), expenses: +expenses.toFixed(2), net, margin };
}

export function pnlByEntity(txs: TxLite[]): Map<string | null, Pnl> {
  const groups = new Map<string | null, TxLite[]>();
  for (const t of txs) {
    const arr = groups.get(t.entity_id) ?? [];
    arr.push(t);
    groups.set(t.entity_id, arr);
  }
  const out = new Map<string | null, Pnl>();
  for (const [k, v] of groups) out.set(k, pnl(v));
  return out;
}

/** Available = total balance − open committed. Never below −∞; just math. */
export function available(totalBalance: number, committedOpen: number): number {
  return +(totalBalance - committedOpen).toFixed(2);
}

export type TargetMetric = "net_profit" | "revenue";

export function targetProgress(
  monthPnl: Pnl,
  target: number,
  metric: TargetMetric,
): { value: number; ratio: number; remaining: number } {
  const value = metric === "revenue" ? monthPnl.income : monthPnl.net;
  if (target <= 0) return { value, ratio: 0, remaining: 0 };
  const ratio = Math.max(0, value / target);
  return { value, ratio, remaining: +Math.max(0, target - value).toFixed(2) };
}

export function growth(current: number, start: number): { delta: number; ratio: number } {
  const delta = +(current - start).toFixed(2);
  const ratio = start !== 0 ? delta / Math.abs(start) : 0;
  return { delta, ratio };
}

/** Daily cumulative balance series for a sparkline. */
export function balanceSeries(
  txs: TxLite[],
  opening: number,
  days: string[], // ascending yyyy-mm-dd
): { date: string; value: number }[] {
  const byDay = new Map<string, number>();
  for (const t of txs) {
    const delta =
      t.type === "income" ? t.amount_base : t.type === "expense" ? -t.amount_base : 0;
    byDay.set(t.occurred_on, (byDay.get(t.occurred_on) ?? 0) + delta);
  }
  // Everything before the window collapses into the opening value.
  const first = days[0];
  let running = opening;
  for (const [d, v] of byDay) if (first && d < first) running += v;
  const out: { date: string; value: number }[] = [];
  for (const d of days) {
    running += byDay.get(d) ?? 0;
    out.push({ date: d, value: +running.toFixed(2) });
  }
  return out;
}
