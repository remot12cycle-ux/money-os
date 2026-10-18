import type { Metadata } from "next";
import { getAccountBalances, getRefData } from "@/lib/data/core";
import { listTransactions } from "@/lib/data/transactions";
import { getNetWorth } from "@/lib/data/dashboard";
import type { TxType } from "@/lib/db/types";
import { MoneyView } from "./money-view";

export const metadata: Metadata = { title: "Money" };

type SP = {
  entity?: string;
  account?: string;
  category?: string;
  type?: string;
  from?: string;
  to?: string;
  q?: string;
};

export default async function MoneyPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const type = (["income", "expense", "transfer"] as const).includes(sp.type as TxType)
    ? (sp.type as TxType)
    : undefined;
  const [ref, balances, txs, nw] = await Promise.all([
    getRefData(),
    getAccountBalances(),
    listTransactions({
      entity: sp.entity,
      account: sp.account,
      category: sp.category,
      type,
      from: sp.from,
      to: sp.to,
      q: sp.q,
      limit: 400,
    }),
    getNetWorth(),
  ]);
  const accounts = ref.accounts
    .filter((a) => !a.is_archived)
    .map((a) => ({ ...a, balance: Number(balances.find((b) => b.account_id === a.id)?.balance ?? 0) }));

  return <MoneyView accounts={accounts} transactions={txs} filters={{ ...sp, type }} netWorth={nw} />;
}
