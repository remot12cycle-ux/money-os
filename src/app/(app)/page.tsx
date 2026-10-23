import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { getDashboard } from "@/lib/data/dashboard";
import { getRefData } from "@/lib/data/core";
import { formatMoney, formatPercent, convert } from "@/lib/money";
import { daysLeftInMonth, monthLabel } from "@/lib/dates";
import { CountUp } from "@/components/charts/count-up";
import { EntityBars, IncomeExpenseChart, Sparkline, TargetRing } from "@/components/charts/charts";
import { Money, Section, Empty, Rows } from "@/components/ui/primitives";
import { TxRow } from "@/components/lists/transaction-row";
import { TaskItem } from "@/components/lists/task-item";
import { Button } from "@/components/ui/button";
import { TargetEditor } from "./budgets/target-editor";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const [d, ref] = await Promise.all([getDashboard(), getRefData()]);
  const { netWorth: nw, base } = d;
  const other = base === "USD" ? "MAD" : "USD";
  const growthTone = nw.growth.delta > 0 ? "text-mint" : nw.growth.delta < 0 ? "text-coral" : "text-ink-2";
  const committedRatio = nw.total > 0 ? Math.min(1, nw.committed / nw.total) : 0;
  const days = daysLeftInMonth(d.month, d.startDay);

  const entityRows = ref.entities
    .filter((e) => !e.is_archived)
    .map((e) => {
      const p = d.byEntity.find((b) => b.entity_id === e.id);
      return { name: e.name, color: e.color, income: p?.income ?? 0, expenses: p?.expenses ?? 0, net: p?.net ?? 0 };
    })
    .filter((r) => r.income || r.expenses);

  return (
    <div className="flex flex-col gap-10">
      {/* ───────── Hero: net worth + split bar ───────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 opacity-70 md:h-36">
          <Sparkline data={d.sparkline} currency={base} />
        </div>
        <div className="relative flex flex-col gap-6 pb-24 md:pb-28">
          <div>
            <p className="label">Net worth</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <CountUp
                value={nw.total}
                currency={base}
                compactDecimals
                className="num text-[clamp(2.25rem,6vw,3.5rem)] font-medium leading-none tracking-[-0.03em]"
              />
              <span className={cn("num text-sm", growthTone)}>
                {formatMoney(nw.growth.delta, base, { sign: true, compactDecimals: true })} ·{" "}
                {nw.growth.ratio >= 0 ? "+" : ""}
                {formatPercent(nw.growth.ratio, 1)} vs {formatMoney(nw.startingCapital, base, { compactDecimals: true })} start
              </span>
            </div>
            <p className="num mt-1.5 text-sm text-ink-2">
              ≈ {formatMoney(convert(nw.total, base, other, nw.rate), other, { compactDecimals: true })}
            </p>
          </div>

          <div className="max-w-xl">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-hairline">
              <div className="h-full bg-mint" style={{ width: `${(1 - committedRatio) * 100}%` }} />
              <div className="ml-0.5 h-full bg-amber" style={{ width: `${committedRatio * 100}%` }} />
            </div>
            <div className="mt-2 flex items-start justify-between gap-4 text-sm">
              <div>
                <p className="label">Available</p>
                <Money amount={nw.available} currency={base} tone="neutral" compactDecimals className="text-base font-medium" />
              </div>
              <div className="text-right">
                <p className="label">Committed</p>
                <Link href="/committed" className="committed-amount num text-base font-medium text-amber hover:brightness-110">
                  {formatMoney(nw.committed, base, { compactDecimals: true })}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Month: target + P&L ───────── */}
      <div className="grid gap-8 md:grid-cols-12">
        <Section title={d.startDay === 1 ? `${monthLabel(d.month)} target` : `Target · ${monthLabel(d.month, d.startDay)}`} className="md:col-span-4">
          <div className="flex items-center gap-5">
            <TargetRing ratio={d.target.ratio}>
              <div className="text-center">
                <div className="num text-2xl font-medium leading-none tracking-[-0.02em]">
                  {d.target.amount > 0 ? formatPercent(d.target.ratio) : "—"}
                </div>
                <div className="mt-1 text-[11px] text-ink-3">
                  {d.target.metric === "revenue" ? "revenue" : "net profit"}
                </div>
              </div>
            </TargetRing>
            <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
              {d.target.amount > 0 ? (
                <>
                  <div>
                    <p className="label">So far</p>
                    <Money amount={d.target.value} currency={base} compactDecimals className="text-base font-medium" />
                  </div>
                  <div>
                    <p className="label">Remaining</p>
                    <span className="num text-base font-medium">
                      {formatMoney(d.target.remaining, base, { compactDecimals: true })}
                    </span>
                    <span className="num ml-2 text-xs text-ink-3">{days}d left</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-2">No monthly target yet.</p>
              )}
              <TargetEditor amount={d.target.amount} metric={d.target.metric} base={base} compact />
            </div>
          </div>
        </Section>

        <Section title={d.startDay === 1 ? "Income vs expenses · 6 months" : "Income vs expenses · 6 periods"} className="md:col-span-8">
          <IncomeExpenseChart data={d.series} currency={base} startDay={d.startDay} />
          <div className="grid grid-cols-3 gap-4 border-t border-hairline pt-3 text-sm">
            <div>
              <p className="label">Income</p>
              <Money amount={d.monthPnl.income} currency={base} tone="mint" compactDecimals className="font-medium" />
            </div>
            <div>
              <p className="label">Expenses</p>
              <Money amount={-d.monthPnl.expenses} currency={base} tone="coral" compactDecimals className="font-medium" />
            </div>
            <div>
              <p className="label">Net</p>
              <Money amount={d.monthPnl.net} currency={base} sign compactDecimals className="font-medium" />
            </div>
          </div>
        </Section>
      </div>

      {/* ───────── Entities + tasks + recent ───────── */}
      <div className="grid gap-8 md:grid-cols-12">
        <Section
          title={d.startDay === 1 ? "P&L by entity · this month" : "P&L by entity · this period"}
          className="md:col-span-5"
          aside={
            <Link href="/businesses" className="flex items-center gap-1 text-xs text-ink-2 hover:text-ink">
              Businesses <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {entityRows.length ? (
            <EntityBars rows={entityRows} currency={base} />
          ) : (
            <Empty title="No activity yet this month" body="Add an income or expense and it shows up here." />
          )}
        </Section>

        <Section
          title="Today"
          className="md:col-span-3"
          aside={
            <Link href="/tasks" className="flex items-center gap-1 text-xs text-ink-2 hover:text-ink">
              All tasks <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {d.tasks.length ? (
            <Rows>
              {d.tasks.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
            </Rows>
          ) : (
            <Empty title="Nothing due today" body="Tasks with a due date of today or earlier appear here." />
          )}
        </Section>

        <Section
          title="Recent"
          className="md:col-span-4"
          aside={
            <Link href="/money" className="flex items-center gap-1 text-xs text-ink-2 hover:text-ink">
              All transactions <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {d.recent.length ? (
            <Rows>
              {d.recent.map((tx) => (
                <TxRow key={tx.id} tx={tx} compact />
              ))}
            </Rows>
          ) : (
            <Empty
              icon={<CalendarClock />}
              title="No transactions yet"
              action={
                <Button asChild variant="secondary" size="sm">
                  <Link href="/money">Open Money</Link>
                </Button>
              }
            />
          )}
        </Section>
      </div>
    </div>
  );
}
