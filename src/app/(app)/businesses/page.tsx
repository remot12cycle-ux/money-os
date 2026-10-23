import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getRefData } from "@/lib/data/core";
import { getBusinessesOverview } from "@/lib/data/businesses";
import { monthLabel, monthParam } from "@/lib/dates";
import { formatMoney, formatPercent, sum } from "@/lib/money";
import { MonthPicker } from "@/components/month-picker";
import { Empty, EntityDot, Money, PageHeader, Stat } from "@/components/ui/primitives";
import { BusinessTabs, NetBars, projectNoun } from "@/components/business/shared";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Businesses" };

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ entity?: string; month?: string }> }) {
  const sp = await searchParams;
  const ref = await getRefData();
  // old links: /businesses?entity=<uuid>
  if (sp.entity) {
    const e = ref.entities.find((x) => x.id === sp.entity);
    if (e) redirect(`/businesses/${e.slug}${sp.month ? `?month=${sp.month}` : ""}`);
  }
  const month = monthParam(sp.month, ref.profile.period_start_day);
  const o = await getBusinessesOverview(month);
  const base = o.base;

  if (!o.businesses.length) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Businesses" />
        <Empty title="No business entities" body="Add one in Settings → Entities." />
      </div>
    );
  }

  const income = sum(o.cards.map((c) => c.period.income));
  const expenses = sum(o.cards.map((c) => c.period.expenses));
  const net = +(income - expenses).toFixed(2);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Businesses"
        subtitle={o.startDay === 1 ? undefined : monthLabel(month, o.startDay)}
        actions={<MonthPicker month={month} />}
      />
      <BusinessTabs list={o.businesses} month={sp.month} />

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Revenue · all" value={<Money amount={income} currency={base} tone="mint" compactDecimals />} />
        <Stat label="Costs · all" value={<Money amount={-expenses} currency={base} tone="coral" compactDecimals />} />
        <Stat label="Profit · all" value={<Money amount={net} currency={base} sign compactDecimals />} />
        <Stat label="Margin" value={<span className={cn(net < 0 && "text-coral")}>{income ? formatPercent(net / income) : "—"}</span>} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {o.businesses.map((e) => {
          const c = o.cards.find((x) => x.entityId === e.id)!;
          const noun = projectNoun(e);
          const delta = c.period.net - c.previous.net;
          const top = [...c.projects].sort((a, b) => b.period.income - a.period.income || a.project.name.localeCompare(b.project.name)).slice(0, 4);
          return (
            <Link
              key={e.id}
              href={{ pathname: `/businesses/${e.slug}`, query: sp.month ? { month: sp.month } : {} }}
              className="group flex flex-col gap-4 rounded-lg border border-hairline bg-surface p-4 transition-colors duration-150 hover:bg-raised"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <EntityDot color={e.color} className="size-2.5" />
                  <h2 className="truncate text-[15px] font-semibold">{e.name}</h2>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-ink" aria-hidden />
              </div>

              <div className="flex items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="label">Profit</span>
                  <Money amount={c.period.net} currency={base} sign compactDecimals className="text-2xl font-medium tracking-[-0.02em]" />
                  <span className="num text-xs text-ink-2">
                    <span className="text-mint">{formatMoney(c.period.income, base, { compactDecimals: true })}</span>
                    {" in · "}
                    <span className="text-coral">{formatMoney(c.period.expenses, base, { compactDecimals: true })}</span>
                    {" out"}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <NetBars values={c.trend.map((t) => t.net)} />
                  <span className={cn("num text-[11px]", delta > 0 ? "text-mint" : delta < 0 ? "text-coral" : "text-ink-3")}>
                    {delta === 0 ? "same as last" : `${formatMoney(delta, base, { sign: true, compactDecimals: true })} vs last`}
                  </span>
                </div>
              </div>

              {e.kind === "salary" ? null : (
                <div className="flex flex-col gap-1.5 border-t border-hairline pt-3">
                  <span className="label">
                    {c.projects.length} {c.projects.length === 1 ? noun.one : noun.many.toLowerCase()}
                  </span>
                  {top.length ? (
                    <ul className="flex flex-col gap-1">
                      {top.map(({ project, period }) => (
                        <li key={project.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate text-ink-2">{project.name}</span>
                          <Money amount={period.net} currency={base} sign compactDecimals className="text-xs" />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-sm text-ink-3">No {noun.many.toLowerCase()} yet — open to add one.</span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
