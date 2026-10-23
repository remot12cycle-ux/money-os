import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getProjects, getRefData } from "./core";
import { listSince, listTransactions, type TxChartRow } from "./transactions";
import { pnl, type Pnl, type TxLite } from "@/lib/metrics";
import { monthRange } from "@/lib/dates";
import type { NoteRow, ProjectRow, TaskRow, TransactionRow } from "@/lib/db/types";

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

type Trend = { month: string; income: number; expenses: number; net: number }[];

function trendOf(rows: TxChartRow[], months: string[], sd: number): Trend {
  return months.map((m) => {
    const r = monthRange(m, sd);
    const p = pnl(rows.filter((t) => t.occurred_on >= r.from && t.occurred_on <= r.to) as TxLite[]);
    return { month: m, income: p.income, expenses: p.expenses, net: p.net };
  });
}

function costsByCategory(rows: Pick<TransactionRow, "type" | "category_id" | "amount_base">[]) {
  const by = new Map<string | null, number>();
  for (const t of rows) {
    if (t.type !== "expense") continue;
    by.set(t.category_id, +((by.get(t.category_id) ?? 0) + t.amount_base).toFixed(2));
  }
  return [...by.entries()];
}

/* ───────── overview: every business at a glance ───────── */
export type BusinessCard = {
  entityId: string;
  period: Pnl;
  previous: Pnl;
  trend: Trend;
  lifetime: Pnl;
  projects: { project: ProjectRow; period: Pnl }[];
};

export async function getBusinessesOverview(month: string) {
  const ref = await getRefData();
  const sd = ref.profile.period_start_day;
  const months = Array.from({ length: 6 }, (_, i) => shiftKey(month, i - 5));
  const { from } = monthRange(months[0]!, sd);
  const cur = monthRange(month, sd);
  const prevKey = shiftKey(month, -1);
  const prev = monthRange(prevKey, sd);

  const rows = await listSince(from);
  const businesses = ref.entities.filter((e) => !e.is_archived && e.kind !== "personal");

  const cards: BusinessCard[] = businesses.map((e) => {
    const mine = rows.filter((t) => t.entity_id === e.id);
    const inRange = (r: { from: string; to: string }) => mine.filter((t) => t.occurred_on >= r.from && t.occurred_on <= r.to) as TxLite[];
    const curRows = inRange(cur) as unknown as TxChartRow[];
    const projects = ref.projects
      .filter((p) => p.entity_id === e.id && p.status !== "archived")
      .map((project) => ({ project, period: pnl(curRows.filter((t) => t.project_id === project.id) as TxLite[]) }));
    return {
      entityId: e.id,
      period: pnl(curRows as TxLite[]),
      previous: pnl(inRange(prev)),
      trend: trendOf(mine, months, sd),
      lifetime: pnl(mine as TxLite[]),
      projects,
    };
  });
  return { base: ref.profile.base_currency, startDay: sd, month, businesses, cards };
}

function shiftKey(month: string, by: number) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/* ───────── notes ───────── */
export const getNotes = cache(async (scope: { entityId?: string; projectId?: string; businessOnly?: boolean }) => {
  const supabase = await createClient();
  let q = supabase.from("notes").select("*").order("is_pinned", { ascending: false }).order("updated_at", { ascending: false }).limit(200);
  if (scope.projectId) q = q.eq("project_id", scope.projectId);
  else if (scope.entityId) {
    q = q.eq("entity_id", scope.entityId);
    if (scope.businessOnly) q = q.is("project_id", null);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as NoteRow[];
});

async function openTasks(filter: { entityId?: string; projectId?: string }) {
  const supabase = await createClient();
  let q = supabase.from("tasks").select("*").neq("status", "done").order("due_on", { ascending: true, nullsFirst: false }).limit(50);
  if (filter.projectId) q = q.eq("project_id", filter.projectId);
  else if (filter.entityId) q = q.eq("entity_id", filter.entityId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

/* ───────── one business ───────── */
export async function getEntityReport(entityId: string, month: string) {
  const profile = await getProfile();
  const sd = profile.period_start_day;
  const months = Array.from({ length: 12 }, (_, i) => shiftKey(month, i - 11));
  const { from: from12 } = monthRange(months[0]!, sd);
  const { from, to } = monthRange(month, sd);

  const [since12, monthRows, projects, notes, tasks] = await Promise.all([
    listSince(from12),
    listTransactions({ entity: entityId, from, to, limit: 5000 }),
    getProjects(),
    getNotes({ entityId, businessOnly: true }),
    openTasks({ entityId }),
  ]);
  const mine = since12.filter((t) => t.entity_id === entityId);
  const mineProjects = projects.filter((p) => p.entity_id === entityId);

  const byProject = mineProjects.map((project) => {
    const rows = monthRows.filter((t) => t.project_id === project.id);
    return { project, period: pnl(rows as TxLite[]), count: rows.length };
  });
  const unassigned = monthRows.filter((t) => !t.project_id || !mineProjects.some((p) => p.id === t.project_id));

  return {
    base: profile.base_currency,
    startDay: sd,
    trend: trendOf(mine, months, sd),
    monthPnl: pnl(monthRows as TxLite[]),
    monthRows,
    byCategory: costsByCategory(monthRows),
    byProject,
    unassigned: { period: pnl(unassigned as TxLite[]), count: unassigned.length },
    notes,
    tasks,
  };
}

/* ───────── one project ───────── */
export async function getProjectReport(project: ProjectRow, month: string) {
  const profile = await getProfile();
  const sd = profile.period_start_day;
  const supabase = await createClient();
  const months = Array.from({ length: 12 }, (_, i) => shiftKey(month, i - 11));
  const { from, to } = monthRange(month, sd);

  const [lifeRes, monthRows, notes, tasks] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount_base, entity_id, project_id, occurred_on, category_id, source")
      .eq("project_id", project.id)
      .order("occurred_on", { ascending: true })
      .limit(20000),
    listTransactions({ project: project.id, from, to, limit: 5000 }),
    getNotes({ projectId: project.id }),
    openTasks({ projectId: project.id }),
  ]);
  if (lifeRes.error) throw lifeRes.error;
  const life = (lifeRes.data ?? []) as TxChartRow[];

  return {
    base: profile.base_currency,
    startDay: sd,
    trend: trendOf(life, months, sd),
    monthPnl: pnl(monthRows as TxLite[]),
    lifetime: pnl(life as TxLite[]),
    firstDate: life[0]?.occurred_on ?? null,
    monthRows,
    byCategory: costsByCategory(monthRows),
    notes,
    tasks,
  };
}
