import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { TransactionRow, TxType } from "@/lib/db/types";
import { monthRange } from "@/lib/dates";

export type TxFilters = {
  from?: string;
  to?: string;
  entity?: string;
  account?: string;
  category?: string;
  type?: TxType;
  q?: string;
  limit?: number;
  source?: import("@/lib/db/types").TxSource;
};

export async function listTransactions(f: TxFilters = {}): Promise<TransactionRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("transactions")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (f.from) q = q.gte("occurred_on", f.from);
  if (f.to) q = q.lte("occurred_on", f.to);
  if (f.entity) q = q.eq("entity_id", f.entity);
  if (f.account) q = q.or(`account_id.eq.${f.account},to_account_id.eq.${f.account}`);
  if (f.category) q = q.eq("category_id", f.category);
  if (f.type) q = q.eq("type", f.type);
  if (f.source) q = q.eq("source", f.source);
  if (f.q) q = q.ilike("note", `%${f.q.replace(/[%_]/g, "")}%`);
  q = q.limit(f.limit ?? 500);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listMonth(month: string): Promise<TransactionRow[]> {
  const { from, to } = monthRange(month);
  return listTransactions({ from, to, limit: 2000 });
}

/** Light rows for charts over a long window. */
export async function listSince(fromISO: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount_base, entity_id, occurred_on, category_id, source")
    .gte("occurred_on", fromISO)
    .limit(10000);
  if (error) throw error;
  return data ?? [];
}

/** All non-transfer rows (for lifetime net worth / sparkline). */
export async function listAllLite() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount_base, entity_id, occurred_on, source")
    .limit(20000);
  if (error) throw error;
  return data ?? [];
}
