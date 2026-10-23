import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getRefData } from "@/lib/data/core";
import { codStats, getProjectReport } from "@/lib/data/businesses";
import { humanDate, monthLabel, monthParam } from "@/lib/dates";
import { formatMoney, formatPercent } from "@/lib/money";
import { MonthPicker } from "@/components/month-picker";
import { CategoryBars, IncomeExpenseChart } from "@/components/charts/charts";
import { Empty, Money, Rows, Section, Stat } from "@/components/ui/primitives";
import { TxRow } from "@/components/lists/transaction-row";
import { Crumbs, StatusChip, projectNoun } from "@/components/business/shared";
import { ProjectButton } from "@/components/business/project-sheet";
import { NotesPanel } from "@/components/business/notes-panel";
import { AddTxButton, TaskList } from "@/components/business/quick-buttons";
import { CodPanel } from "@/components/business/cod-panel";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ entity: string; project: string }>; searchParams: Promise<{ month?: string }> };

async function resolve(params: Props["params"]) {
  const [{ entity: eSlug, project: pSlug }, ref] = await Promise.all([params, getRefData()]);
  const entity = ref.entities.find((e) => e.slug === eSlug && e.kind !== "personal");
  const project = entity ? ref.projects.find((p) => p.entity_id === entity.id && p.slug === pSlug) : undefined;
  return { ref, entity, project };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entity, project } = await resolve(params);
  return { title: project && entity ? `${project.name} · ${entity.name}` : "Project" };
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const [{ ref, entity, project }, sp] = await Promise.all([resolve(params), searchParams]);
  if (!entity || !project) notFound();

  const sd = ref.profile.period_start_day;
  const month = monthParam(sp.month, sd);
  const r = await getProjectReport(project, month);
  const base = r.base;
  const noun = projectNoun(entity);
  const catNames = new Map(ref.categories.map((c) => [c.id, c.name]));
  const catRows = r.byCategory
    .map(([id, value]) => ({ name: (id && catNames.get(id)) || "Uncategorised", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const q = sp.month ? `?month=${sp.month}` : "";
  const periodWord = sd === 1 ? "this month" : "this period";
  const host = project.url ? project.url.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Crumbs
          items={[
            { href: `/businesses${q}`, label: "Businesses" },
            { href: `/businesses/${entity.slug}${q}`, label: entity.name },
            { label: project.name },
          ]}
        />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-[-0.02em]">{project.name}</h1>
              <StatusChip status={project.status} />
            </div>
            {project.description ? <p className="max-w-2xl text-sm text-ink-2">{project.description}</p> : null}
            {host ? (
              <a href={project.url!} target="_blank" rel="noreferrer noopener" className="inline-flex w-fit items-center gap-1 text-sm text-mint hover:underline">
                {host} <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker month={month} />
            <AddTxButton entityId={entity.id} projectId={project.id} primary />
            <ProjectButton entity={entity} project={project} noun={noun.one} />
          </div>
        </div>
        {sd !== 1 ? <p className="text-sm text-ink-2">{monthLabel(month, sd)}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Revenue" value={<Money amount={r.monthPnl.income} currency={base} tone="mint" compactDecimals />} />
        <Stat label="Costs" value={<Money amount={-r.monthPnl.expenses} currency={base} tone="coral" compactDecimals />} />
        <Stat label="Profit" value={<Money amount={r.monthPnl.net} currency={base} sign compactDecimals />} />
        <Stat
          label="Margin"
          value={<span className={cn(r.monthPnl.margin < 0 && "text-coral")}>{r.monthPnl.income ? formatPercent(r.monthPnl.margin) : "—"}</span>}
        />
      </div>
      {r.firstDate ? (
        <p className="num -mt-4 text-xs text-ink-2">
          Since {humanDate(r.firstDate)}: <span className="text-mint">{formatMoney(r.lifetime.income, base, { compactDecimals: true })}</span> revenue ·{" "}
          <span className="text-coral">{formatMoney(r.lifetime.expenses, base, { compactDecimals: true })}</span> costs ·{" "}
          <span className={r.lifetime.net >= 0 ? "text-mint" : "text-coral"}>{formatMoney(r.lifetime.net, base, { sign: true, compactDecimals: true })}</span> profit
        </p>
      ) : null}

      <div className="grid gap-8 md:grid-cols-12">
        <Section title="Notes & ideas" className="md:col-span-7">
          <NotesPanel notes={r.notes} entityId={entity.id} projectId={project.id} placeholder={`An idea for ${project.name}… (Ctrl/⌘ + Enter to save)`} />
        </Section>
        <Section title="Open tasks" className="md:col-span-5">
          <TaskList tasks={r.tasks} entityId={entity.id} projectId={project.id} />
        </Section>
      </div>

      {entity.slug === "cod-africa" ? <CodPanel stats={codStats(r.monthRows, catNames)} base={base} title={`COD performance · ${periodWord}`} /> : null}

      <div className="grid gap-8 md:grid-cols-12">
        <Section title={sd === 1 ? "12-month trend" : "12-period trend"} className="md:col-span-7">
          <IncomeExpenseChart data={r.trend} currency={base} startDay={sd} />
        </Section>
        <Section title="Where the money went" className="md:col-span-5">
          {catRows.length ? <CategoryBars rows={catRows} currency={base} /> : <Empty title={`No costs ${periodWord}`} />}
        </Section>
      </div>

      <Section title={`Transactions · ${periodWord}`} aside={<AddTxButton entityId={entity.id} projectId={project.id} label="Add" />}>
        {r.monthRows.length ? (
          <Rows>
            {r.monthRows.map((tx) => (
              <TxRow key={tx.id} tx={tx} showDate />
            ))}
          </Rows>
        ) : (
          <Empty
            title={`Nothing recorded ${periodWord}`}
            body={`Sales and costs you tag with ${project.name} land here. Your ad-spend app can tag it too (field "project").`}
            action={<AddTxButton entityId={entity.id} projectId={project.id} primary label="Add" />}
          />
        )}
      </Section>
    </div>
  );
}
