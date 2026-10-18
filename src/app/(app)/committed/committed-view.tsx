"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Segmented } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { Empty, EntityDot, Money, PageHeader, Rows, Stat } from "@/components/ui/primitives";
import { CommittedSheet } from "@/components/forms/committed-sheet";
import { useRef_ } from "@/components/ref-provider";
import { cancelCommitted, deleteCommitted, markCommittedPaid, reopenCommitted } from "@/lib/actions/committed";
import type { CommittedRow } from "@/lib/db/types";
import { humanDate, isOverdue, todayISO } from "@/lib/dates";
import { convert, formatMoney, sum } from "@/lib/money";
import { cn } from "@/lib/utils";

export function CommittedView({
  items,
  netWorth,
}: {
  items: CommittedRow[];
  netWorth: { base: "USD" | "MAD"; rate: number; total: number; committed: number; available: number };
}) {
  const { entities, accounts, profile } = useRef_();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<"open" | "history">("open");
  const [edit, setEdit] = useState<{ open: boolean; item: CommittedRow | null }>({ open: false, item: null });
  const [pay, setPay] = useState<CommittedRow | null>(null);
  const [payAccount, setPayAccount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());
  const [payAmount, setPayAmount] = useState("");
  const [pending, start] = useTransition();
  const base = profile.base_currency;

  const open = items.filter((i) => i.status === "open");
  const history = items.filter((i) => i.status !== "open");
  const overdue = open.filter((i) => isOverdue(i.due_on));
  const overdueTotal = sum(overdue.map((i) => convert(i.amount, i.currency, base, netWorth.rate)));

  function startPay(item: CommittedRow) {
    setPay(item);
    setPayAccount(item.account_id ?? accounts.find((a) => a.currency === item.currency && !a.is_archived)?.id ?? accounts[0]?.id ?? "");
    setPayDate(todayISO());
    setPayAmount(String(item.amount));
  }

  function confirmPay() {
    if (!pay) return;
    start(async () => {
      const res = await markCommittedPaid({ id: pay.id, account_id: payAccount, paid_on: payDate, amount: Number(payAmount) || undefined });
      if (!res.ok) return void toast.error(res.error);
      toast.success(`Paid · ${formatMoney(Number(payAmount) || pay.amount, pay.currency)} left your wallet`);
      setPay(null);
      router.refresh();
    });
  }

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error ?? "Something went wrong");
      toast.success(msg);
      router.refresh();
    });
  }

  const list = tab === "open" ? open : history;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Committed"
        subtitle="Money you still have to pay. Counted against what's available, but not yet out of your wallet."
        actions={
          <Button variant="primary" onClick={() => setEdit({ open: true, item: null })}>
            <Plus /> Commit an amount
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Committed" value={<span className="committed-amount text-amber">{formatMoney(netWorth.committed, base, { compactDecimals: true })}</span>} sub={`${open.length} open`} />
        <Stat label="Available after" value={<Money amount={netWorth.available} currency={base} tone="neutral" compactDecimals />} sub={`of ${formatMoney(netWorth.total, base, { compactDecimals: true })}`} />
        <Stat label="Overdue" value={<span className={cn(overdue.length && "text-coral")}>{overdue.length ? formatMoney(overdueTotal, base, { compactDecimals: true }) : "—"}</span>} sub={overdue.length ? `${overdue.length} item${overdue.length > 1 ? "s" : ""}` : "nothing overdue"} />
        <Stat label="Paid (all time)" value={formatMoney(sum(history.filter((h) => h.status === "paid").map((h) => convert(h.amount, h.currency, base, netWorth.rate))), base, { compactDecimals: true })} />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "open", label: `Open · ${open.length}`, tone: "amber" },
          { value: "history", label: `History · ${history.length}` },
        ]}
      />

      {list.length ? (
        <Rows>
          <AnimatePresence initial={false}>
            {list.map((item) => {
              const entity = entities.find((e) => e.id === item.entity_id);
              const late = item.status === "open" && isOverdue(item.due_on);
              return (
                <motion.div
                  key={item.id}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.2 }}
                  className="group flex items-center gap-3 py-3"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      item.status === "open" ? (late ? "bg-coral" : "bg-amber") : item.status === "paid" ? "bg-mint" : "bg-ink-3",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.title}</div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                      {entity ? (
                        <span className="inline-flex items-center gap-1">
                          <EntityDot color={entity.color} /> {entity.name}
                        </span>
                      ) : null}
                      {item.due_on ? (
                        <span className={cn("num", late && "text-coral")}>
                          {late ? "Overdue · " : "Due "}
                          {humanDate(item.due_on)}
                        </span>
                      ) : null}
                      {item.status !== "open" ? <span className="capitalize">{item.status}</span> : null}
                    </div>
                  </div>
                  <span className={cn("num text-sm font-medium", item.status === "open" ? "committed-amount text-amber" : "text-ink-2")}>
                    {formatMoney(item.amount, item.currency)}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.status === "open" ? (
                      <>
                        <Button size="sm" variant="primary" onClick={() => startPay(item)}>
                          <Check /> Paid
                        </Button>
                        <button type="button" className="grid size-8 place-items-center rounded-md text-ink-3 opacity-0 transition-opacity hover:bg-raised hover:text-ink group-hover:opacity-100" aria-label="Edit" onClick={() => setEdit({ open: true, item })}>
                          <Pencil className="size-4" />
                        </button>
                        <button type="button" className="grid size-8 place-items-center rounded-md text-ink-3 opacity-0 transition-opacity hover:bg-raised hover:text-ink group-hover:opacity-100" aria-label="Cancel" onClick={() => act(() => cancelCommitted(item.id), "Cancelled")}>
                          <X className="size-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-raised hover:text-ink" aria-label="Reopen" title="Reopen (does not delete the paid transaction)" onClick={() => act(() => reopenCommitted(item.id), "Reopened")}>
                          <RotateCcw className="size-4" />
                        </button>
                        <button type="button" className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-coral-soft hover:text-coral" aria-label="Delete" onClick={() => act(() => deleteCommitted(item.id), "Deleted")}>
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </Rows>
      ) : (
        <Empty
          title={tab === "open" ? "Nothing committed" : "No history yet"}
          body={tab === "open" ? "When you order products you'll pay on delivery, commit the amount here so your available balance stays honest." : undefined}
          action={tab === "open" ? <Button variant="primary" size="sm" onClick={() => setEdit({ open: true, item: null })}><Plus /> Commit an amount</Button> : undefined}
        />
      )}

      <CommittedSheet open={edit.open} onOpenChange={(o) => setEdit((s) => ({ ...s, open: o }))} initial={edit.item} />

      <Sheet
        open={Boolean(pay)}
        onOpenChange={(o) => !o && setPay(null)}
        title="Mark as paid"
        description={pay ? `${pay.title} · ${formatMoney(pay.amount, pay.currency)}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPay(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmPay} loading={pending} disabled={!payAccount}>Confirm payment</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Amount actually paid" htmlFor="pay_amount" hint="Edit if the final amount differed">
            <Input id="pay_amount" type="number" step="0.01" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="num" />
          </Field>
          <Field label="From account" htmlFor="pay_acc">
            <Select id="pay_acc" value={payAccount} onChange={(e) => setPayAccount(e.target.value)}>
              {accounts.filter((a) => !a.is_archived).map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>
              ))}
            </Select>
          </Field>
          <Field label="Paid on" htmlFor="pay_date">
            <Input id="pay_date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </Field>
          <p className="text-xs text-ink-3">This creates a real expense transaction and closes the commitment.</p>
        </div>
      </Sheet>
    </div>
  );
}
