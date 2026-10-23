"use client";

import { useState, useTransition } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { Empty, Money, ProgressBar, Rows, Section, Tile } from "@/components/ui/primitives";
import { TargetRing } from "@/components/charts/charts";
import { useRef_ } from "@/components/ref-provider";
import { contributeToGoal, copyBudgetsFromPreviousMonth, deleteGoal, saveGoal, setBudget } from "@/lib/actions/budgets";
import type { BudgetRow, GoalRow, TargetMetric } from "@/lib/db/types";
import type { Pnl } from "@/lib/metrics";
import { formatMoney, formatPercent } from "@/lib/money";
import { humanDate } from "@/lib/dates";
import { TargetEditor } from "./target-editor";
import { cn } from "@/lib/utils";

export function BudgetsView({
  month,
  budgets,
  spent,
  goals,
  target,
  monthPnl,
}: {
  month: string;
  budgets: BudgetRow[];
  spent: [string, number][];
  goals: GoalRow[];
  target: { value: number; ratio: number; remaining: number; amount: number; metric: TargetMetric };
  monthPnl: Pnl;
}) {
  const { categories, profile } = useRef_();
  const base = profile.base_currency;
  const [pending, start] = useTransition();
  const [goalSheet, setGoalSheet] = useState<{ open: boolean; goal: GoalRow | null }>({ open: false, goal: null });
  const [gTitle, setGTitle] = useState("");
  const [gTarget, setGTarget] = useState("");
  const [gDeadline, setGDeadline] = useState("");
  const [contrib, setContrib] = useState<{ goal: GoalRow; amount: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const spentMap = new Map(spent);
  const budgetMap = new Map(budgets.map((b) => [b.category_id, Number(b.amount_base)]));
  const expenseCats = categories.filter((c) => c.kind === "expense" && !c.is_archived);
  const budgeted = expenseCats.filter((c) => budgetMap.has(c.id));
  const unbudgeted = expenseCats.filter((c) => !budgetMap.has(c.id) && (spentMap.get(c.id) ?? 0) > 0);
  const totalBudget = [...budgetMap.values()].reduce((a, b) => a + b, 0);
  const totalSpentBudgeted = budgeted.reduce((a, c) => a + (spentMap.get(c.id) ?? 0), 0);

  function commitBudget(categoryId: string) {
    const amount = Number(draft);
    setEditing(null);
    start(async () => {
      const res = await setBudget({ category_id: categoryId, month, amount_base: Number.isFinite(amount) ? amount : 0 });
      if (!res.ok) return void toast.error(res.error);
    });
  }

  function openGoal(goal: GoalRow | null) {
    setGTitle(goal?.title ?? "");
    setGTarget(goal ? String(goal.target_amount_base) : "");
    setGDeadline(goal?.deadline ?? "");
    setGoalSheet({ open: true, goal });
  }

  function submitGoal() {
    start(async () => {
      const res = await saveGoal({ id: goalSheet.goal?.id, title: gTitle, target_amount_base: Number(gTarget), deadline: gDeadline || null });
      if (!res.ok) return void toast.error(res.error);
      toast.success(goalSheet.goal ? "Goal updated" : "Goal created");
      setGoalSheet({ open: false, goal: null });
    });
  }

  return (
    <div className="flex flex-col gap-10">
      {/* monthly target */}
      <Section title="Monthly target">
        <div className="flex flex-wrap items-center gap-6">
          <TargetRing ratio={target.ratio} size={120} stroke={10}>
            <span className="num text-xl font-medium">{target.amount > 0 ? formatPercent(target.ratio) : "—"}</span>
          </TargetRing>
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="label">Target</p>
              <span className="num text-base font-medium">{target.amount > 0 ? formatMoney(target.amount, base, { compactDecimals: true }) : "—"}</span>
              <p className="text-xs text-ink-3">{target.metric === "revenue" ? "revenue" : "net profit"}</p>
            </div>
            <div>
              <p className="label">So far</p>
              <Money amount={target.value} currency={base} compactDecimals className="text-base font-medium" />
            </div>
            <div>
              <p className="label">Remaining</p>
              <span className="num text-base font-medium">{formatMoney(target.remaining, base, { compactDecimals: true })}</span>
            </div>
            <div>
              <p className="label">Income · Expenses</p>
              <span className="num text-sm">
                <span className="text-mint">{formatMoney(monthPnl.income, base, { compactDecimals: true })}</span>
                <span className="text-ink-3"> · </span>
                <span className="text-coral">{formatMoney(monthPnl.expenses, base, { compactDecimals: true })}</span>
              </span>
            </div>
          </div>
          <TargetEditor amount={target.amount} metric={target.metric} base={base} />
        </div>
      </Section>

      {/* budgets */}
      <Section
        title="Category budgets"
        aside={
          <div className="flex items-center gap-2">
            <span className="num text-xs text-ink-2">
              {formatMoney(totalSpentBudgeted, base, { compactDecimals: true })} / {formatMoney(totalBudget, base, { compactDecimals: true })}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                start(async () => {
                  const r = await copyBudgetsFromPreviousMonth(month);
                  if (!r.ok) return void toast.error(r.error);
                  toast.success(`Copied ${r.data.copied} budgets`);
                })
              }
              disabled={pending}
            >
              <Copy /> Copy last month
            </Button>
          </div>
        }
      >
        <Rows>
          {expenseCats.map((c) => {
            const b = budgetMap.get(c.id);
            const s = spentMap.get(c.id) ?? 0;
            const ratio = b ? s / b : 0;
            const over = b ? s > b : false;
            const isEditing = editing === c.id;
            if (!b && !s && !isEditing) return null;
            return (
              <div key={c.id} className="flex flex-col gap-1.5 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{c.name}</span>
                  <div className="flex items-center gap-3">
                    <span className={cn("num text-[13px]", over ? "text-coral" : "text-ink-2")}>
                      {formatMoney(s, base, { compactDecimals: true })}
                      {b ? <span className="text-ink-3"> / </span> : null}
                    </span>
                    {isEditing ? (
                      <Input
                        autoFocus
                        type="number"
                        inputMode="decimal"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commitBudget(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitBudget(c.id);
                          if (e.key === "Escape") setEditing(null);
                        }}
                        className="num h-8 w-28 text-right"
                        aria-label={`Budget for ${c.name}`}
                      />
                    ) : (
                      <button
                        type="button"
                        className="num rounded px-1.5 py-0.5 text-[13px] text-ink hover:bg-raised"
                        onClick={() => {
                          setEditing(c.id);
                          setDraft(b ? String(b) : "");
                        }}
                      >
                        {b ? formatMoney(b, base, { compactDecimals: true }) : "Set budget"}
                      </button>
                    )}
                  </div>
                </div>
                {b ? <ProgressBar ratio={ratio} tone={over ? "coral" : ratio > 0.85 ? "amber" : "mint"} /> : null}
              </div>
            );
          })}
        </Rows>
        {!budgeted.length && !unbudgeted.length ? (
          <Empty title="No budgets for this month" body="Pick a category below to set a limit, or copy last month." />
        ) : null}
        <details className="group">
          <summary className="cursor-pointer text-sm text-ink-2 hover:text-ink">Add a budget for another category</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {expenseCats
              .filter((c) => !budgetMap.has(c.id))
              .map((c) => (
                <Button
                  key={c.id}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(c.id);
                    setDraft("");
                  }}
                >
                  <Plus /> {c.name}
                </Button>
              ))}
          </div>
        </details>
      </Section>

      {/* goals */}
      <Section
        title="Savings goals"
        aside={
          <Button size="sm" variant="secondary" onClick={() => openGoal(null)}>
            <Plus /> New goal
          </Button>
        }
      >
        {goals.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((g) => {
              const ratio = Number(g.current_amount_base) / Number(g.target_amount_base);
              return (
                <Tile key={g.id} className={cn("flex flex-col gap-3", g.is_done && "border-mint/50")}>
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" className="text-left text-sm font-medium hover:underline" onClick={() => openGoal(g)}>
                      {g.title}
                    </button>
                    <button
                      type="button"
                      className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-coral-soft hover:text-coral"
                      aria-label="Delete goal"
                      onClick={() =>
                        start(async () => {
                          const r = await deleteGoal(g.id);
                          if (!r.ok) toast.error(r.error);
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="num text-xl font-medium tracking-[-0.02em]">{formatMoney(Number(g.current_amount_base), base, { compactDecimals: true })}</span>
                    <span className="num text-xs text-ink-3">of {formatMoney(Number(g.target_amount_base), base, { compactDecimals: true })}</span>
                  </div>
                  <ProgressBar ratio={ratio} />
                  <div className="flex items-center justify-between text-xs text-ink-3">
                    <span>{g.is_done ? "Done" : `${formatPercent(ratio)}${g.deadline ? ` · by ${humanDate(g.deadline)}` : ""}`}</span>
                    <Button size="sm" variant="ghost" onClick={() => setContrib({ goal: g, amount: "" })}>
                      <Plus /> Add
                    </Button>
                  </div>
                </Tile>
              );
            })}
          </div>
        ) : (
          <Empty title="No goals yet" body="Create a goal like 'Emergency fund' and add to it as you save." action={<Button size="sm" variant="primary" onClick={() => openGoal(null)}><Plus /> New goal</Button>} />
        )}
      </Section>

      <Sheet
        open={goalSheet.open}
        onOpenChange={(o) => setGoalSheet((s) => ({ ...s, open: o }))}
        title={goalSheet.goal ? "Edit goal" : "New savings goal"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setGoalSheet({ open: false, goal: null })}>Cancel</Button>
            <Button variant="primary" onClick={submitGoal} loading={pending}>{goalSheet.goal ? "Save" : "Create"}</Button>
          </>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submitGoal(); }}>
          <Field label="Goal" htmlFor="g_title"><Input id="g_title" value={gTitle} onChange={(e) => setGTitle(e.target.value)} autoFocus placeholder="e.g. Emergency fund" /></Field>
          <Field label={`Target (${base})`} htmlFor="g_target"><Input id="g_target" type="number" inputMode="decimal" min="0" value={gTarget} onChange={(e) => setGTarget(e.target.value)} className="num" /></Field>
          <Field label="Deadline" htmlFor="g_deadline" hint="Optional"><Input id="g_deadline" type="date" value={gDeadline} onChange={(e) => setGDeadline(e.target.value)} /></Field>
          <button type="submit" className="hidden" aria-hidden />
        </form>
      </Sheet>

      <Sheet
        open={Boolean(contrib)}
        onOpenChange={(o) => !o && setContrib(null)}
        title={contrib ? `Add to “${contrib.goal.title}”` : ""}
        description="Use a negative number to take money back out."
        footer={
          <>
            <Button variant="ghost" onClick={() => setContrib(null)}>Cancel</Button>
            <Button
              variant="primary"
              loading={pending}
              onClick={() =>
                contrib &&
                start(async () => {
                  const r = await contributeToGoal(contrib.goal.id, Number(contrib.amount));
                  if (!r.ok) return void toast.error(r.error);
                  toast.success("Goal updated");
                  setContrib(null);
                })
              }
            >
              Add
            </Button>
          </>
        }
      >
        <Field label={`Amount (${base})`} htmlFor="c_amt">
          <Input id="c_amt" type="number" inputMode="decimal" step="0.01" autoFocus value={contrib?.amount ?? ""} onChange={(e) => contrib && setContrib({ ...contrib, amount: e.target.value })} className="num text-xl h-12" />
        </Field>
      </Sheet>
    </div>
  );
}
