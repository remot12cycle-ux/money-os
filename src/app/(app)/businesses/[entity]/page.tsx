import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getRefData } from "@/lib/data/core";
import { codStats, getEntityReport } from "@/lib/data/businesses";
import { monthLabel, monthParam } from "@/lib/dates";
import { formatMoney, formatPercent } from "@/lib/money";
import { MonthPicker } from "@/components/month-picker";
import { CategoryBars, IncomeExpenseChart } from "@/components/charts/charts";
import { Empty, EntityDot, Money, Rows, Section, Stat } from "@/components/ui/primitives";
import { TxRow } from "@/components/lists/transaction-row";
import { BusinessTabs, Crumbs, StatusChip, projectNoun } from "@/components/business/shared";
import { ProjectButton } from "@/components/business/project-sheet";
import { NotesPanel } from "@/components/business/notes-panel";
import { AddTxButton, TaskList } from "@/components/business/quick-buttons";
import { CodPanel } from "@/components/business/cod-panel";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ entity: string }>; searchParams: Promise<{ month?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entity } = await params;
  const ref = await getRefData();
  return { title: ref.entities.find((e) => e.slug === entity)?.name ?? "Business" };
}

export default async function BusinessPage({ params, searchParams }: Props) {
  const [{ entity: slug }, sp, ref] = await Promise.all([params, searchParams, getRefData()]);
  const list = ref.entities.filter((e) => !e.is_archived && e.kind !== "personal");
  const entity = ref.entities.find((e) => e.slug === slug && e.kind !== "personal");
  if (!entity) notFound();

  const sd = ref.profile.period_start_day;
  const month = monthParam(sp.month, sd);
  const r = await getEntityReport(entity.id, month);
  const base = r.base;
  const noun = projectNoun(entity);
  const catNames = new Map(ref.categories.map((c) => [c.id, c.name]));
  const isCod = entity.slug === "cod-africa";
  const catRows = r.byCategory
    .map(([id, value]) => ({ name: (id && catNames.get(id)) || "Uncategorised", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const q = sp.month ? `?month=${sp.month}` : "";
  const projects = [...r.byProject].sort(
    (a, b) =>
      Number(a.project.status === "archived") - Number(b.project.status === "archived") ||
      b.period.income - a.period.income ||
      a.project.sort_order - b.project.sort_order,
  );
  const periodWord = sd === 1 ? "this month" : "this period";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Crumbs items={[{ href: `/businesses${q}`, label: "Businesses" }, { label: entity.name }]} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <EntityDot color={entity.color} className="size-3" />
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">{entity.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker month={month} />
            <AddTxButton entityId={entity.id} />
            {entity.kind === "salary" ? null : <ProjectButton entity={entity} noun={noun.one} variant="primary" />}
          </div>
        </div>
        {sd !== 1 ? <p className="text-sm text-ink-2">{monthLabel(month, sd)}</p> : null}
      </div>
      <BusinessTabs list={list} activeId={entity.id} month={sp.month} />

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Revenue" value={<Money amount={r.monthPnl.income} currency={base} tone="mint" compactDecimals />} />
        <Stat label="Costs" value={<Money amount={-r.monthPnl.expenses} currency={base} tone="coral" compactDecimals />} />
        <Stat label="Profit" value={<Money amount={r.monthPnl.net} currency={base} sign compactDecimals />} />
        <Stat
          label="Margin"
          value={<span className={cn(r.monthPnl.margin < 0 && "text-coral")}>{r.monthPnl.income ? formatPercent(r.monthPnl.margin) : "—"}</span>}
        />
      </div>

      {entity.kind === "salary" ? null : (
        <Section title={`${noun.many} · ${periodWord}`}>
          {projects.length ? (
            <div className="overflow-hidden rounded-lg border border-hairline">
              <div className="hidden grid-cols-[minmax(0,1fr)_repeat(3,7rem)_1.5rem] gap-3 border-b border-hairline px-4 py-2 md:grid">
                <span className="label">{noun.one}</span>
                <span className="label text-right">Revenue</span>
                <span className="label text-right">Costs</span>
                <span className="label text-right">Profit</span>
                <span />
              </div>
              <Rows>
                {projects.map(({ project, period }) => (
                  <Link
                    key={project.id}
                    href={`/businesses/${entity.slug}/${project.slug}${q}`}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto_1.5rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-raised md:grid-cols-[minmax(0,1fr)_repeat(3,7rem)_1.5rem]",
                      project.status === "archived" && "opacity-60",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium">{project.name}</span>
                      {project.status !== "active" ? <StatusChip status={project.status} /> : null}
                    </span>
                    <Money amount={period.income} currency={base} tone={period.income ? "mint" : "neutral"} compactDecimals className="hidden text-right text-sm md:block" />
                    <Money amount={-period.expenses} currency={base} tone={period.expenses ? "coral" : "neutral"} compactDecimals className="hidden text-right text-sm md:block" />
                    <Money amount={period.net} currency={base} sign compactDecimals className="text-right text-sm font-medium" />
                    <ChevronRight className="size-4 text-ink-3" aria-hidden />
                  </Link>
                ))}
                {r.unassigned.count ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_1.5rem] items-center gap-3 px-4 py-3 text-ink-2 md:grid-cols-[minmax(0,1fr)_repeat(3,7rem)_1.5rem]">
                    <span className="text-sm italic">Whole business (no {noun.one})</span>
                    <span className="num hidden text-right text-sm md:block">{formatMoney(r.unassigned.period.income, base, { compactDecimals: true })}</span>
                    <span className="num hidden text-right text-sm md:block">{formatMoney(-r.unassigned.period.expenses, base, { compactDecimals: true })}</span>
                    <Money amount={r.unassigned.period.net} currency={base} sign compactDecimals className="text-right text-sm" />
                    <span />
                  </div>
                ) : null}
              </Rows>
            </div>
          ) : (
            <Empty
              title={`No ${noun.many.toLowerCase()} yet`}
              body={`Add each ${noun.one} to see its own revenue, costs, notes and tasks. Money you add can then be tagged to it.`}
              action={<ProjectButton entity={entity} noun={noun.one} variant="primary" />}
            />
          )}
        </Section>
      )}

      {isCod ? <CodPanel stats={codStats(r.monthRows, catNames)} base={base} title={`COD performance · ${periodWord}`} /> : null}

      <div className="grid gap-8 md:grid-cols-12">
        <Section title={sd === 1 ? "12-month trend" : "12-period trend"} className="md:col-span-7">
          <IncomeExpenseChart data={r.trend} currency={base} startDay={sd} />
        </Section>
        <Section title="Where the money went" className="md:col-span-5">
          {catRows.length ? <CategoryBars rows={catRows} currency={base} /> : <Empty title={`No costs ${periodWord}`} />}
        </Section>
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        <Section title={`Notes · ${entity.name}`} className="md:col-span-7">
          <NotesPanel notes={r.notes} entityId={entity.id} placeholder={`An idea for ${entity.name}… (Ctrl/⌘ + Enter to save)`} />
        </Section>
        <Section title="Open tasks" className="md:col-span-5">
          <TaskList tasks={r.tasks} entityId={entity.id} />
        </Section>
      </div>

      <Section title={`Transactions · ${periodWord}`} aside={<AddTxButton entityId={entity.id} label="Add" />}>
        {r.monthRows.length ? (
          <Rows>
            {r.monthRows.map((tx) => (
              <TxRow key={tx.id} tx={tx} showDate />
            ))}
          </Rows>
        ) : (
          <Empty title={`Nothing recorded ${periodWord}`} body="Add a sale or a cost for this business." action={<AddTxButton entityId={entity.id} primary label="Add" />} />
        )}
      </Section>
    </div>
  );
}
