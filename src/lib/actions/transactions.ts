"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rateToBase } from "@/lib/money";
import { fail, fromZod, ok, type ActionResult } from "./result";
import { txSchema, type TxInput } from "@/lib/schemas/transaction";
import type { Currency } from "@/lib/db/types";

export type { TxInput };

function revalidateMoney() {
  for (const p of ["/", "/money", "/businesses", "/budgets", "/committed", "/debts"]) {
    revalidatePath(p);
  }
}

async function fxFor(currency: Currency) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("base_currency, usd_to_mad")
    .eq("id", user.id)
    .single();
  const base = (data?.base_currency ?? "USD") as Currency;
  return rateToBase(currency, base, Number(data?.usd_to_mad ?? 10));
}

/** The account decides the currency: a MAD account only ever holds MAD rows. */
async function accountCurrency(accountId: string): Promise<Currency | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("accounts").select("currency").eq("id", accountId).maybeSingle();
  return (data?.currency as Currency | undefined) ?? null;
}

export async function saveTransaction(input: TxInput): Promise<ActionResult<{ id: string }>> {
  const parsed = txSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();

  const currency = await accountCurrency(v.account_id);
  if (!currency) return fail("Account not found", { account_id: "Pick an account" });
  if (currency !== v.currency) {
    return fail(`This account is in ${currency}. Switch the amount to ${currency} or pick another account.`, {
      amount: `Amount must be in ${currency}`,
    });
  }

  const base = {
    type: v.type,
    amount: v.amount,
    currency,
    account_id: v.account_id,
    to_account_id: v.type === "transfer" ? v.to_account_id ?? null : null,
    category_id: v.type === "transfer" ? null : v.category_id ?? null,
    entity_id: v.entity_id ?? null,
    occurred_on: v.occurred_on,
    note: v.note ?? null,
  };

  if (v.id) {
    const { data: existing } = await supabase
      .from("transactions")
      .select("currency, meta")
      .eq("id", v.id)
      .maybeSingle();
    if (!existing) return fail("Transaction not found");
    // Keep the historical rate unless the currency actually changed; keep meta unless the form sent some.
    const fx = existing.currency === currency ? {} : { fx_rate_to_base: await fxFor(currency) };
    const meta =
      v.meta === undefined
        ? {}
        : { meta: { ...((existing.meta as Record<string, unknown> | null) ?? {}), ...v.meta } as Record<string, never> };
    const { error } = await supabase.from("transactions").update({ ...base, ...fx, ...meta }).eq("id", v.id);
    if (error) return fail(error.message);
    revalidateMoney();
    return ok({ id: v.id });
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...base, fx_rate_to_base: await fxFor(currency), meta: (v.meta ?? {}) as Record<string, never>, source: "manual" })
    .select("id")
    .single();
  if (error) return fail(error.message);
  revalidateMoney();
  return ok({ id: data.id });
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return fail("Invalid id");
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidateMoney();
  return ok(undefined);
}

const restoreSchema = z.object({
  id: z.uuid(),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().min(0),
  currency: z.enum(["USD", "MAD"]),
  fx_rate_to_base: z.number().positive(),
  account_id: z.uuid(),
  to_account_id: z.uuid().nullable(),
  category_id: z.uuid().nullable(),
  entity_id: z.uuid().nullable(),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).nullable(),
  source: z.enum(["manual", "ingest", "committed", "recurring", "opening", "debt"]),
  external_id: z.string().max(200).nullable(),
  meta: z.unknown(),
});

/** Used by undo: re-insert a row that was just deleted (same id so links stay valid). */
export async function restoreTransaction(row: z.input<typeof restoreSchema>): Promise<ActionResult> {
  const parsed = restoreSchema.safeParse(row);
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    ...parsed.data,
    meta: ((parsed.data.meta as Record<string, unknown> | null) ?? {}) as Record<string, never>,
  });
  if (error) return fail(error.message);
  revalidateMoney();
  return ok(undefined);
}
