import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAccountBalances, getProfile } from "./core";
import { listAllLite, listSince, listTransactions } from "./transactions";
import { convert, sum, type Currency } from "@/lib/money";
import { available, balanceSeries, growth, pnl, pnlByEntity, targetProgress, type TxLite } from "@/lib/metrics";
import { currentMonth, lastNDays, lastNMonths, monthRange, todayISO } from "@/lib/dates";

export async function getCommittedOpenTotal(base: Currency, usdToMad: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("committed_payables")
    .select("amount, currency")
    .eq("status", "open");
  if (error) throw error;
  return sum((data ?? []).map((c) => convert(Number(c.amount), c.currency, base, usdToMad)));
}

export async function getNetWorth() {
  const profile = await getProfile();
  const base = profile.base_currency;
  const rate = Number(profile.usd_to_mad);
  const balances = await getAccountBalances();
  const total = sum(balances.map((b) => convert(Number(b.balance), b.currency, base, rate)));
  const committed = await getCommittedOpenTotal(base, rate);
  return {
    base,
    rate,
    total,
    committed,
    available: available(total, committed),
    growth: growth(total, Number(profile.starting_capital)),
    startingCapital: Number(profile.starting_capital),
  };
}

export async function getDashboard(month = currentMonth()) {
  const profile = await getProfile();
  const base = profile.base_currency;
  const rate = Number(profile.usd_to_mad);
  const supabase = await createClient();

  const months = lastNMonths(6);
  const { from: sixFrom } = monthRange(months[0]!);
  const { from, to } = monthRange(month);

  const [netWorth, since6, allLite, recent, tasksRes] = await Promise.all([
    getNetWorth(),
    listSince(sixFrom),
    listAllLite(),
    listTransactions({ limit: 8 }),
    supabase
      .from("tasks")
      .select("*")
      .neq("status", "done")
      .or(`due_on.is.null,due_on.lte.${todayISO()}`)
      .order("due_on", { ascending: true, nullsFirst: false })
      .limit(12),
  ]);

  const monthTx = since6.filter((t) => t.occurred_on >= from && t.occurred_on <= to) as TxLite[];
  const monthPnl = pnl(monthTx);
  const byEntity = pnlByEntity(monthTx);

  const series = months.map((m) => {
    const r = monthRange(m);
    const p = pnl(since6.filter((t) => t.occurred_on >= r.from && t.occurred_on <= r.to) as TxLite[]);
    return { month: m, income: p.income, expenses: p.expenses, net: p.net };
  });

  const days = lastNDays(90);
  // opening = everything before the window (balanceSeries folds that in)
  const spark = balanceSeries(allLite as TxLite[], 0, days);
  // The sparkline is in base currency from transactions only; align its end to the live net worth.
  const offset = netWorth.total - (spark.at(-1)?.value ?? 0);
  const sparkline = spark.map((p) => ({ ...p, value: +(p.value + offset).toFixed(2) }));

  const target = targetProgress(monthPnl, Number(profile.monthly_target), profile.target_metric);

  const rank = { high: 0, medium: 1, low: 2 } as const;
  const tasks = (tasksRes.data ?? [])
    .sort((a, b) => (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999") || rank[a.priority] - rank[b.priority])
    .slice(0, 5);

  return {
    base,
    rate,
    month,
    netWorth,
    monthPnl,
    byEntity: [...byEntity.entries()].map(([entity_id, p]) => ({ entity_id, ...p })),
    series,
    sparkline,
    target: { ...target, amount: Number(profile.monthly_target), metric: profile.target_metric },
    tasks,
    recent,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
