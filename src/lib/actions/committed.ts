"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rateToBase } from "@/lib/money";
import { fail, fromZod, ok, type ActionResult } from "./result";

const schema = z.object({
  id: z.uuid().optional(),
  title: z.string().min(1, "Give it a title").max(140),
  amount: z.coerce.number().min(0),
  currency: z.enum(["USD", "MAD"]),
  entity_id: z.uuid().optional().nullable(),
  category_id: z.uuid().optional().nullable(),
  account_id: z.uuid().optional().nullable(),
  due_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});
export type CommittedInput = z.input<typeof schema>;

const revalidate = () => ["/", "/committed", "/money"].forEach((p) => revalidatePath(p));

export async function saveCommitted(input: CommittedInput): Promise<ActionResult<{ id: string }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const row = {
    title: v.title,
    amount: v.amount,
    currency: v.currency,
    entity_id: v.entity_id ?? null,
    category_id: v.category_id ?? null,
    account_id: v.account_id ?? null,
    due_on: v.due_on ?? null,
    note: v.note ?? null,
  };
  if (v.id) {
    const { error } = await supabase.from("committed_payables").update(row).eq("id", v.id);
    if (error) return fail(error.message);
    revalidate();
    return ok({ id: v.id });
  }
  const { data, error } = await supabase
    .from("committed_payables")
    .insert(row)
    .select("id")
    .single();
  if (error) return fail(error.message);
  revalidate();
  return ok({ id: data.id });
}

/** Marks a committed item paid: creates the real expense and closes it. */
export async function markCommittedPaid(input: {
  id: string;
  account_id: string;
  paid_on: string;
  amount?: number;
}): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: c, error: e1 } = await supabase
    .from("committed_payables")
    .select("*")
    .eq("id", input.id)
    .single();
  if (e1 || !c) return fail("Committed item not found");
  if (c.status !== "open") return fail("Already closed");

  const { data: p } = await supabase
    .from("profiles")
    .select("base_currency, usd_to_mad")
    .eq("id", user.id)
    .single();
  const fx = rateToBase(c.currency, (p?.base_currency ?? "USD") as "USD" | "MAD", Number(p?.usd_to_mad ?? 10));

  const { data: tx, error: e2 } = await supabase
    .from("transactions")
    .insert({
      type: "expense",
      amount: input.amount ?? c.amount,
      currency: c.currency,
      fx_rate_to_base: fx,
      account_id: input.account_id,
      category_id: c.category_id,
      entity_id: c.entity_id,
      occurred_on: input.paid_on,
      note: c.title,
      source: "committed",
    })
    .select("id")
    .single();
  if (e2) return fail(e2.message);

  const { error: e3 } = await supabase
    .from("committed_payables")
    .update({ status: "paid", paid_transaction_id: tx.id, account_id: input.account_id })
    .eq("id", c.id);
  if (e3) return fail(e3.message);
  revalidate();
  return ok(undefined);
}

export async function cancelCommitted(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("committed_payables")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok(undefined);
}

export async function reopenCommitted(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("committed_payables")
    .update({ status: "open", paid_transaction_id: null })
    .eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok(undefined);
}

export async function deleteCommitted(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("committed_payables").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok(undefined);
}
