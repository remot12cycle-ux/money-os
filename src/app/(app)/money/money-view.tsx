"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Empty, Money, PageHeader, Rows, Tile } from "@/components/ui/primitives";
import { TransactionSheet } from "@/components/forms/transaction-sheet";
import { TxRow } from "@/components/lists/transaction-row";
import { useRef_ } from "@/components/ref-provider";
import { deleteTransaction, restoreTransaction } from "@/lib/actions/transactions";
import type { AccountRow, TransactionRow, TxType } from "@/lib/db/types";
import { humanDate } from "@/lib/dates";
import { convert, formatMoney, sum } from "@/lib/money";
import { cn } from "@/lib/utils";

type Filters = {
  entity?: string;
  account?: string;
  category?: string;
  type?: TxType;
  from?: string;
  to?: string;
  q?: string;
};

export function MoneyView({
  accounts,
  transactions,
  filters,
  netWorth,
}: {
  accounts: (AccountRow & { balance: number })[];
  transactions: TransactionRow[];
  filters: Filters;
  netWorth: { base: "USD" | "MAD"; rate: number; total: number; committed: number; available: number };
}) {
  const { entities, categories, profile } = useRef_();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [sheet, setSheet] = useState<{ open: boolean; tx: TransactionRow | null }>({ open: false, tx: null });
  const [q, setQ] = useState(filters.q ?? "");
  const [, start] = useTransition();
  const reduce = useReducedMotion();

  function setParam(key: string, value?: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`${pathname}?${next.toString()}`));
  }

  const hasFilters = Boolean(filters.entity || filters.account || filters.category || filters.type || filters.from || filters.to || filters.q);

  const groups = useMemo(() => {
    const map = new Map<string, TransactionRow[]>();
    for (const t of transactions) {
      const arr = map.get(t.occurred_on) ?? [];
      arr.push(t);
      map.set(t.occurred_on, arr);
    }
    return [...map.entries()];
  }, [transactions]);

  const base = profile.base_currency;
  const shownIncome = sum(transactions.filter((t) => t.type === "income" && t.source !== "opening").map((t) => t.amount_base));
  const shownExpense = sum(transactions.filter((t) => t.type === "expense").map((t) => t.amount_base));

  function remove(tx: TransactionRow) {
    start(async () => {
      const res = await deleteTransaction(tx.id);
      if (!res.ok) return void toast.error(res.error);
      toast("Transaction deleted", {
        action: {
          label: "Undo",
          onClick: () =>
            start(async () => {
              const r = await restoreTransaction({
                id: tx.id,
                type: tx.type,
                amount: tx.amount,
                currency: tx.currency,
                fx_rate_to_base: tx.fx_rate_to_base,
                account_id: tx.account_id,
                to_account_id: tx.to_account_id,
                category_id: tx.category_id,
                entity_id: tx.entity_id,
                occurred_on: tx.occurred_on,
                note: tx.note,
                source: tx.source,
                external_id: tx.external_id,
                meta: tx.meta,
              });
              if (!r.ok) toast.error(r.error);
            }),
        },
        duration: 6000,
      });
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Money"
        subtitle={
          <>
            Available <Money amount={netWorth.available} currency={base} tone="neutral" compactDecimals className="font-medium" />{" "}
            · committed{" "}
            <span className="num committed-amount text-amber">{formatMoney(netWorth.committed, base, { compactDecimals: true })}</span>
          </>
        }
        actions={
          <Button variant="primary" onClick={() => setSheet({ open: true, tx: null })}>
            <Plus /> Add transaction
          </Button>
        }
      />

      {/* accounts */}
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-4">
        {accounts.map((a) => {
          const active = filters.account === a.id;
          return (
            <Tile
              key={a.id}
              interactive
              onClick={() => setParam("account", active ? undefined : a.id)}
              className={cn("min-w-[200px] shrink-0 md:min-w-0", active && "border-mint/60 bg-raised")}
              aria-pressed={active}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{a.name}</span>
                <span className="label">{a.currency}</span>
              </div>
              <div className="num mt-2 text-xl font-medium tracking-[-0.02em]">
                {formatMoney(a.balance, a.currency, { compactDecimals: true })}
              </div>
              {a.currency !== base ? (
                <div className="num mt-0.5 text-xs text-ink-3">
                  ≈ {formatMoney(convert(a.balance, a.currency, base, netWorth.rate), base, { compactDecimals: true })}
                </div>
              ) : (
                <div className="mt-0.5 text-xs text-ink-3 capitalize">{a.type}</div>
              )}
            </Tile>
          );
        })}
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            placeholder="Search notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setParam("q", q || undefined);
            }}
            onBlur={() => q !== (filters.q ?? "") && setParam("q", q || undefined)}
            className="h-9 pl-9"
            aria-label="Search transactions"
          />
        </div>
        <Select value={filters.type ?? ""} onChange={(e) => setParam("type", e.target.value || undefined)} className="h-9 w-auto min-w-[120px]" aria-label="Type">
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </Select>
        <Select value={filters.entity ?? ""} onChange={(e) => setParam("entity", e.target.value || undefined)} className="h-9 w-auto min-w-[140px]" aria-label="Entity">
          <option value="">All entities</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
        <Select value={filters.category ?? ""} onChange={(e) => setParam("category", e.target.value || undefined)} className="h-9 w-auto min-w-[150px]" aria-label="Category">
          <option value="">All categories</option>
          {categories
            .filter((c) => !c.is_archived)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
        <Input type="date" value={filters.from ?? ""} onChange={(e) => setParam("from", e.target.value || undefined)} className="h-9 w-auto" aria-label="From date" />
        <Input type="date" value={filters.to ?? ""} onChange={(e) => setParam("to", e.target.value || undefined)} className="h-9 w-auto" aria-label="To date" />
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={() => start(() => router.replace(pathname))}>
            <X /> Clear
          </Button>
        ) : null}
      </div>

      {/* totals for the shown list */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-y border-hairline py-2 text-sm">
        <span className="text-ink-2">
          {transactions.length} transaction{transactions.length === 1 ? "" : "s"}
        </span>
        <span>
          <span className="label mr-2">In</span>
          <Money amount={shownIncome} currency={base} tone="mint" compactDecimals />
        </span>
        <span>
          <span className="label mr-2">Out</span>
          <Money amount={-shownExpense} currency={base} tone="coral" compactDecimals />
        </span>
        <span>
          <span className="label mr-2">Net</span>
          <Money amount={shownIncome - shownExpense} currency={base} sign compactDecimals />
        </span>
      </div>

      {/* list */}
      {groups.length ? (
        <div className="flex flex-col gap-6">
          <AnimatePresence initial={false}>
            {groups.map(([day, rows]) => (
              <motion.section
                key={day}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="label">{humanDate(day)}</h3>
                  <span className="num text-xs text-ink-3">
                    {formatMoney(
                      sum(rows.map((r) => (r.type === "income" ? r.amount_base : r.type === "expense" ? -r.amount_base : 0))),
                      base,
                      { sign: true, compactDecimals: true },
                    )}
                  </span>
                </div>
                <Rows>
                  {rows.map((tx) => (
                    <TxRow key={tx.id} tx={tx} onEdit={(t) => setSheet({ open: true, tx: t })} onDelete={remove} />
                  ))}
                </Rows>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Empty
          title={hasFilters ? "Nothing matches these filters" : "No transactions yet"}
          body={hasFilters ? "Try clearing a filter." : "Add your first income or expense."}
          action={
            !hasFilters ? (
              <Button variant="primary" size="sm" onClick={() => setSheet({ open: true, tx: null })}>
                <Plus /> Add transaction
              </Button>
            ) : undefined
          }
        />
      )}

      <TransactionSheet
        open={sheet.open}
        onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))}
        initial={sheet.tx}
        defaults={filters.account ? { account_id: filters.account } : undefined}
      />
    </div>
  );
}
