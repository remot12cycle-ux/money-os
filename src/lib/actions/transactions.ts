"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rateToBase } from "@/lib/money";
import { fail, fromZod, ok, type ActionResult } from "./result";

const money = z.coerce.number().min(0, "Amount must be positive");
const uuid = z.uuid();
const dateISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const txSchema = z
  .object({
    id: uuid.optional(),
    type: z.enum(["income", "expense", "transfer"]),
    amount: money,
    currency: z.enum(["USD", "MAD"]),
    account_id: uuid,
    to_account_id: uuid.optional().nullable(),
    category_id: uuid.optional().nullable(),
    entity_id: uuid.optional().nullable(),
    occurred_on: dateISO,
    note: z.string().max(500).optional().nullable(),
    meta: z
      .object({
        ad_spend: z.coerce.number().optional(),
        product_cost: z.coerce.number().optional(),
        units: z.coerce.number().int().optional(),
        delivered: z.coerce.number().int().optional(),
        returned: z.coerce.number().int().optional(),
        country: z.string().max(60).optional(),
      })
      .partial()
      .optional(),
  })
  .refine((v) => v.type !== "transfer" || (v.to_account_id && v.to_account_id !== v.account_id), {
    message: "Pick a different destination account",
    path: ["to_account_id"],
  });

export type TxInput = z.input<typeof txSchema>;

function revalidateMoney() {
  for (const p of ["/", "/money", "/businesses", "/budgets", "/committed", "/debts"]) {
    revalidatePath(p);
  }
}

async function fxFor(currency: "USD" | "MAD") {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("base_currency, usd_to_mad")
    .eq("id", user.id)
    .single();
  const base = (data?.base_currency ?? "USD") as "USD" | "MAD";
  return rateToBase(currency, base, Number(data?.usd_to_mad ?? 10));
}

export async function saveTransaction(input: TxInput): Promise<ActionResult<{ id: string }>> {
  const parsed = txSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const fx = await fxFor(v.currency);

  const row = {
    type: v.type,
    amount: v.amount,
    currency: v.currency,
    fx_rate_to_base: fx,
    account_id: v.account_id,
    to_account_id: v.type === "transfer" ? v.to_account_id ?? null : null,
    category_id: v.type === "transfer" ? null : v.category_id ?? null,
    entity_id: v.entity_id ?? null,
    occurred_on: v.occurred_on,
    note: v.note ?? null,
    meta: v.meta ?? {},
  };

  if (v.id) {
    const { error } = await supabase.from("transactions").update(row).eq("id", v.id);
    if (error) return fail(error.message);
    revalidateMoney();
    return ok({ id: v.id });
  }
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...row, source: "manual" })
    .select("id")
    .single();
  if (error) return fail(error.message);
  revalidateMoney();
  return ok({ id: data.id });
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidateMoney();
  return ok(undefined);
}

/** Used by undo: re-insert a previously deleted row with the same id. */
export async function restoreTransaction(row: {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: "USD" | "MAD";
  fx_rate_to_base: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  entity_id: string | null;
  occurred_on: string;
  note: string | null;
  source: "manual" | "ingest" | "committed" | "recurring" | "opening" | "debt";
  external_id: string | null;
  meta: unknown;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    ...row,
    meta: (row.meta ?? {}) as Record<string, never>,
  });
  if (error) return fail(error.message);
  revalidateMoney();
  return ok(undefined);
}
