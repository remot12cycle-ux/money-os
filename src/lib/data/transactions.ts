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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const uuidOr = (v?: string) => (v && UUID.test(v) ? v : undefined);
const dateOr = (v?: string) => (v && DATE.test(v) ? v : undefined);

/** Supabase caps a single read at `max-rows` (1000 by default); page through with range(). */
const PAGE = 1000;
async function fetchAll<T>(make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, max = 50_000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const { data, error } = await make(from, Math.min(from + PAGE, max) - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export async function listTransactions(f: TxFilters = {}): Promise<TransactionRow[]> {
  const supabase = await createClient();
  const limit = f.limit ?? 500;
  return fetchAll<TransactionRow>((from, to) => {
    let q = supabase
      .from("transactions")
      .select("*")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false });
    const fromD = dateOr(f.from), toD = dateOr(f.to);
    const entity = uuidOr(f.entity), account = uuidOr(f.account), category = uuidOr(f.category);
    if (fromD) q = q.gte("occurred_on", fromD);
    if (toD) q = q.lte("occurred_on", toD);
    if (entity) q = q.eq("entity_id", entity);
    if (account) q = q.or(`account_id.eq.${account},to_account_id.eq.${account}`);
    if (category) q = q.eq("category_id", category);
    if (f.type) q = q.eq("type", f.type);
    if (f.source) q = q.eq("source", f.source);
    if (f.q) q = q.ilike("note", `%${f.q.replace(/[%_\\]/g, "").slice(0, 80)}%`);
    return q.range(from, to);
  }, limit);
}

export async function listMonth(month: string): Promise<TransactionRow[]> {
  const { from, to } = monthRange(month);
  return listTransactions({ from, to, limit: 20_000 });
}

export type TxChartRow = Pick<TransactionRow, "type" | "amount_base" | "entity_id" | "occurred_on" | "category_id" | "source">;

/** Light rows for charts over a long window (paged, ordered). */
export async function listSince(fromISO: string): Promise<TxChartRow[]> {
  const supabase = await createClient();
  return fetchAll<TxChartRow>((from, to) =>
    supabase
      .from("transactions")
      .select("type, amount_base, entity_id, occurred_on, category_id, source")
      .gte("occurred_on", fromISO)
      .order("occurred_on", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
}

/** Every row (lifetime net worth / sparkline). */
export async function listAllLite(): Promise<TxChartRow[]> {
  const supabase = await createClient();
  return fetchAll<TxChartRow>((from, to) =>
    supabase
      .from("transactions")
      .select("type, amount_base, entity_id, occurred_on, category_id, source")
      .order("occurred_on", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
}
