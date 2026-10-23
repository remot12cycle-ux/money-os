"use server";

import { revalidateApp } from "@/lib/revalidate";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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

const revalidate = revalidateApp;

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

const paySchema = z.object({
  id: z.uuid(),
  account_id: z.uuid(),
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.coerce.number().positive().optional(),
});

/**
 * Marks a committed item paid. One SQL function creates the expense (converted
 * into the paying account's currency if needed) and closes the item atomically.
 */
export async function markCommittedPaid(input: z.input<typeof paySchema>): Promise<ActionResult> {
  const parsed = paySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("pay_committed", {
    p_id: parsed.data.id,
    p_account: parsed.data.account_id,
    p_paid_on: parsed.data.paid_on,
    p_amount: parsed.data.amount ?? null,
  });
  if (error) return fail(error.message);
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

/** Reopens a paid item and removes the expense it created, so nothing is counted twice. */
export async function reopenCommitted(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return fail("Invalid id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_committed", { p_id: id });
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
