import "server-only";

import { getProfile } from "./core";
import { listSince, listTransactions } from "./transactions";
import { pnl, type TxLite } from "@/lib/metrics";
import { lastNMonths, monthRange } from "@/lib/dates";
import type { TransactionRow } from "@/lib/db/types";

export type CodStats = {
  adSpend: number;
  productCost: number;
  shipping: number;
  revenue: number;
  units: number;
  delivered: number;
  returned: number;
  deliveryRate: number;
  roas: number;
  profitPerDelivered: number;
};

export function codStats(txs: TransactionRow[], categoryNames: Map<string, string>): CodStats {
  let adSpend = 0, productCost = 0, shipping = 0, revenue = 0, units = 0, delivered = 0, returned = 0;
  for (const t of txs) {
    const cat = (t.category_id && categoryNames.get(t.category_id)) || "";
    const m = (t.meta ?? {}) as Record<string, number | undefined>;
    if (t.type === "income") revenue += t.amount_base;
    if (t.type === "expense") {
      if (/ads/i.test(cat)) adSpend += t.amount_base;
      else if (/product cost/i.test(cat)) productCost += t.amount_base;
      else if (/shipping|delivery/i.test(cat)) shipping += t.amount_base;
    }
    units += Number(m.units ?? 0);
    delivered += Number(m.delivered ?? 0);
    returned += Number(m.returned ?? 0);
  }
  const p = pnl(txs as TxLite[]);
  return {
    adSpend: +adSpend.toFixed(2),
    productCost: +productCost.toFixed(2),
    shipping: +shipping.toFixed(2),
    revenue: +revenue.toFixed(2),
    units,
    delivered,
    returned,
    deliveryRate: units > 0 ? delivered / units : 0,
    roas: adSpend > 0 ? revenue / adSpend : 0,
    profitPerDelivered: delivered > 0 ? +(p.net / delivered).toFixed(2) : 0,
  };
}

export async function getEntityReport(entityId: string, month: string) {
  const profile = await getProfile();
  const months = lastNMonths(12);
  const { from: from12 } = monthRange(months[0]!);
  const { from, to } = monthRange(month);

  const [since12, monthRows] = await Promise.all([
    listSince(from12),
    listTransactions({ entity: entityId, from, to, limit: 2000 }),
  ]);
  const mine = since12.filter((t) => t.entity_id === entityId);

  const trend = months.map((m) => {
    const r = monthRange(m);
    const p = pnl(mine.filter((t) => t.occurred_on >= r.from && t.occurred_on <= r.to) as TxLite[]);
    return { month: m, income: p.income, expenses: p.expenses, net: p.net };
  });

  const monthPnl = pnl(monthRows as TxLite[]);

  const byCategory = new Map<string | null, number>();
  for (const t of monthRows) {
    if (t.type !== "expense") continue;
    byCategory.set(t.category_id, (byCategory.get(t.category_id) ?? 0) + t.amount_base);
  }

  return { base: profile.base_currency, trend, monthPnl, monthRows, byCategory: [...byCategory.entries()] };
}
