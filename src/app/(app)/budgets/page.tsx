import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getRefData } from "@/lib/data/core";
import { listMonth } from "@/lib/data/transactions";
import { monthParam } from "@/lib/dates";
import { pnl, targetProgress, type TxLite } from "@/lib/metrics";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/ui/primitives";
import { BudgetsView } from "./budgets-view";

export const metadata: Metadata = { title: "Budgets & Goals" };

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const ref = await getRefData();
  const sd = ref.profile.period_start_day;
  const month = monthParam(sp.month, sd);
  const supabase = await createClient();
  const [txs, budgetsRes, goalsRes] = await Promise.all([
    listMonth(month, sd),
    // budgets are keyed by the period's key month ("yyyy-MM-01"), whatever the start day
    supabase.from("budgets").select("*").eq("month", `${month}-01`),
    supabase.from("goals").select("*").order("is_done").order("created_at"),
  ]);

  const spent = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "expense" || !t.category_id) continue;
    spent.set(t.category_id, +((spent.get(t.category_id) ?? 0) + t.amount_base).toFixed(2));
  }
  const monthPnl = pnl(txs as TxLite[]);
  const target = targetProgress(monthPnl, Number(ref.profile.monthly_target), ref.profile.target_metric);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Budgets & Goals" actions={<MonthPicker month={month} />} />
      <BudgetsView
        month={month}
        budgets={budgetsRes.data ?? []}
        spent={[...spent.entries()]}
        goals={goalsRes.data ?? []}
        target={{ ...target, amount: Number(ref.profile.monthly_target), metric: ref.profile.target_metric }}
        monthPnl={monthPnl}
      />
    </div>
  );
}
