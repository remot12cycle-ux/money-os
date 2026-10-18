"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Segmented, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { Empty, PageHeader, ProgressBar, Section, Stat, Tile } from "@/components/ui/primitives";
import { AmountInput } from "@/components/forms/amount-input";
import { useRef_ } from "@/components/ref-provider";
import { deleteDebt, recordDebtPayment, reopenDebt, saveDebt } from "@/lib/actions/debts";
import type { AccountRow, DebtDirection, DebtPaymentRow, DebtRow } from "@/lib/db/types";
import { humanDate, isOverdue, todayISO } from "@/lib/dates";
import { convert, formatMoney, sum, type Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

export function DebtsView({ debts, payments }: { debts: DebtRow[]; payments: DebtPaymentRow[] }) {
  const { accounts, profile } = useRef_();
  const base = profile.base_currency;
  const rate = Number(profile.usd_to_mad);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sheet, setSheet] = useState<{ open: boolean; debt: DebtRow | null }>({ open: false, debt: null });
  const [pay, setPay] = useState<DebtRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());
  const [payAccount, setPayAccount] = useState("");

  const [cp, setCp] = useState("");
  const [dir, setDir] = useState<DebtDirection>("owed_to_me");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(base);
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");

  const paidFor = (id: string) => sum(payments.filter((p) => p.debt_id === id).map((p) => Number(p.amount)));
  const open = debts.filter((d) => d.status === "open");
  const owedToMe = open.filter((d) => d.direction === "owed_to_me");
  const iOwe = open.filter((d) => d.direction === "i_owe");
  const remaining = (d: DebtRow) => Math.max(0, +(Number(d.principal) - paidFor(d.id)).toFixed(2));
  const totalIn = sum(owedToMe.map((d) => convert(remaining(d), d.currency, base, rate)));
  const totalOut = sum(iOwe.map((d) => convert(remaining(d), d.currency, base, rate)));

  function openSheet(d: DebtRow | null, direction?: DebtDirection) {
    setCp(d?.counterparty ?? "");
    setDir(d?.direction ?? direction ?? "owed_to_me");
    setAmount(d ? String(d.principal) : "");
    setCurrency(d?.currency ?? base);
    setDue(d?.due_on ?? "");
    setNote(d?.note ?? "");
    setSheet({ open: true, debt: d });
  }

  function submit() {
    start(async () => {
      const r = await saveDebt({ id: sheet.debt?.id, counterparty: cp, direction: dir, principal: Number(amount), currency, due_on: due || null, note: note || null });
      if (!r.ok) return void toast.error(r.error);
      toast.success(sheet.debt ? "Updated" : "Added");
      setSheet({ open: false, debt: null });
      router.refresh();
    });
  }

  function submitPay() {
    if (!pay) return;
    start(async () => {
      const r = await recordDebtPayment({ debt_id: pay.id, amount: Number(payAmount), paid_on: payDate, account_id: payAccount || null });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Payment recorded");
      setPay(null);
      router.refresh();
    });
  }

  const settled = debts.filter((d) => d.status === "settled");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Debts & loans" actions={<Button variant="primary" onClick={() => openSheet(null)}><Plus /> Add</Button>} />
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Owed to you" value={<span className="text-mint">{formatMoney(totalIn, base, { compactDecimals: true })}</span>} sub={`${owedToMe.length} open`} />
        <Stat label="You owe" value={<span className="text-coral">{formatMoney(totalOut, base, { compactDecimals: true })}</span>} sub={`${iOwe.length} open`} />
        <Stat label="Net position" value={formatMoney(totalIn - totalOut, base, { sign: true, compactDecimals: true })} />
        <Stat label="Settled" value={settled.length} />
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        {(["owed_to_me", "i_owe"] as const).map((direction) => (
          <DebtColumn
            key={direction}
            title={direction === "owed_to_me" ? "Owed to me" : "I owe"}
            list={direction === "owed_to_me" ? owedToMe : iOwe}
            direction={direction}
            remaining={remaining}
            accounts={accounts}
            openSheet={openSheet}
            setPay={setPay}
            setPayAmount={setPayAmount}
            setPayDate={setPayDate}
            setPayAccount={setPayAccount}
            onDelete={(id) => start(async () => { const r = await deleteDebt(id); if (!r.ok) toast.error(r.error); router.refresh(); })}
          />
        ))}
      </div>
      {settled.length ? (
        <Section title="Settled">
          <div className="divide-y divide-hairline">
            {settled.map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-2.5 text-sm text-ink-2">
                <span className="flex-1 truncate">{d.counterparty}</span>
                <span className="num">{formatMoney(Number(d.principal), d.currency, { compactDecimals: true })}</span>
                <span className="text-xs">{d.direction === "owed_to_me" ? "paid back" : "paid off"}</span>
                <button type="button" className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-raised hover:text-ink" aria-label="Reopen" onClick={() => start(async () => { const r = await reopenDebt(d.id); if (!r.ok) toast.error(r.error); router.refresh(); })}>
                  <RotateCcw className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <Sheet open={sheet.open} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))} title={sheet.debt ? "Edit debt" : "New debt or loan"} footer={<><Button variant="ghost" onClick={() => setSheet({ open: false, debt: null })}>Cancel</Button><Button variant="primary" onClick={submit} loading={pending}>{sheet.debt ? "Save" : "Add"}</Button></>}>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Segmented value={dir} onChange={setDir} className="w-full [&>button]:flex-1" options={[{ value: "owed_to_me", label: "Owed to me", tone: "mint" }, { value: "i_owe", label: "I owe", tone: "coral" }]} />
          <Field label={dir === "owed_to_me" ? "Who owes you" : "Who you owe"} htmlFor="d_cp"><Input id="d_cp" value={cp} onChange={(e) => setCp(e.target.value)} autoFocus /></Field>
          <AmountInput id="d_amount" value={amount} onChange={setAmount} currency={currency} onCurrencyChange={setCurrency} />
          <Field label="Due date" htmlFor="d_due" hint="Optional"><Input id="d_due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
          <Field label="Note" htmlFor="d_note"><Textarea id="d_note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16" /></Field>
          <button type="submit" className="hidden" aria-hidden />
        </form>
      </Sheet>

      <Sheet open={Boolean(pay)} onOpenChange={(o) => !o && setPay(null)} title="Record a payment" description={pay ? `${pay.counterparty} · ${formatMoney(remaining(pay), pay.currency)} remaining` : undefined} footer={<><Button variant="ghost" onClick={() => setPay(null)}>Cancel</Button><Button variant="primary" onClick={submitPay} loading={pending}>Record</Button></>}>
        <div className="flex flex-col gap-4">
          <Field label={`Amount (${pay?.currency ?? ""})`} htmlFor="p_amt"><Input id="p_amt" type="number" step="0.01" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="num text-xl h-12" autoFocus /></Field>
          <Field label="Date" htmlFor="p_date"><Input id="p_date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></Field>
          <Field label="Also record in an account" htmlFor="p_acc" hint={pay?.direction === "owed_to_me" ? "Creates an income transaction" : "Creates an expense transaction"}>
            <Select id="p_acc" value={payAccount} onChange={(e) => setPayAccount(e.target.value)}>
              <option value="">Don&apos;t touch my accounts</option>
              {accounts.filter((a) => !a.is_archived).map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
            </Select>
          </Field>
        </div>
      </Sheet>
    </div>
  );
}

function DebtColumn({
title, list, direction, remaining, accounts, openSheet, setPay, setPayAmount, setPayDate, setPayAccount, onDelete,
}: {
title: string;
list: DebtRow[];
direction: DebtDirection;
remaining: (d: DebtRow) => number;
accounts: AccountRow[];
openSheet: (d: DebtRow | null, direction?: DebtDirection) => void;
setPay: (d: DebtRow) => void;
setPayAmount: (v: string) => void;
setPayDate: (v: string) => void;
setPayAccount: (v: string) => void;
onDelete: (id: string) => void;
}) {
  return (
    <Section
      title={title}
      aside={
        <Button size="sm" variant="ghost" onClick={() => openSheet(null, direction)}>
          <Plus /> Add
        </Button>
      }
    >
      {list.length ? (
        <div className="flex flex-col gap-3">
          {list.map((d) => {
            const rem = remaining(d);
            const ratio = 1 - rem / Number(d.principal);
            const late = isOverdue(d.due_on);
            return (
              <Tile key={d.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button type="button" className="truncate text-left text-sm font-medium hover:underline" onClick={() => openSheet(d)}>
                      {d.counterparty}
                    </button>
                    <div className="text-xs text-ink-3">
                      {d.due_on ? <span className={cn("num", late && "text-coral")}>{late ? "Overdue · " : "Due "}{humanDate(d.due_on)}</span> : "No due date"}
                      {d.note ? ` · ${d.note}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("num text-base font-medium", direction === "owed_to_me" ? "text-mint" : "text-coral")}>
                      {formatMoney(rem, d.currency, { compactDecimals: true })}
                    </div>
                    <div className="num text-[11px] text-ink-3">of {formatMoney(Number(d.principal), d.currency, { compactDecimals: true })}</div>
                  </div>
                </div>
                <ProgressBar ratio={ratio} tone={direction === "owed_to_me" ? "mint" : "coral"} />
                <div className="flex items-center justify-between">
                  <Button size="sm" variant="secondary" onClick={() => { setPay(d); setPayAmount(String(rem)); setPayDate(todayISO()); setPayAccount(accounts.find((a) => a.currency === d.currency && !a.is_archived)?.id ?? ""); }}>
                    Record payment
                  </Button>
                  <button type="button" className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-coral-soft hover:text-coral" aria-label="Delete" onClick={() => onDelete(d.id)}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Tile>
            );
          })}
        </div>
      ) : (
        <Empty title={direction === "owed_to_me" ? "Nobody owes you" : "You owe nothing"} />
      )}
    </Section>
  );
}
