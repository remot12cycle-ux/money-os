"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, fromZod, ok, type ActionResult } from "./result";

const revalidate = () => ["/", "/debts", "/money"].forEach((p) => revalidatePath(p));

const schema = z.object({
  id: z.uuid().optional(),
  counterparty: z.string().min(1, "Who?").max(100),
  direction: z.enum(["owed_to_me", "i_owe"]),
  principal: z.coerce.number().positive("Amount must be above zero"),
  currency: z.enum(["USD", "MAD"]),
  due_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});
export type DebtInput = z.input<typeof schema>;

export async function saveDebt(input: DebtInput): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const row = {
    counterparty: v.counterparty,
    direction: v.direction,
    principal: v.principal,
    currency: v.currency,
    due_on: v.due_on ?? null,
    note: v.note ?? null,
  };
  const { error } = v.id
    ? await supabase.from("debts").update(row).eq("id", v.id)
    : await supabase.from("debts").insert(row);
  if (error) return fail(error.message);
  revalidate();
  return ok(undefined);
}

const paymentSchema = z.object({
  debt_id: z.uuid(),
  amount: z.coerce.number().positive("Amount must be above zero"),
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account_id: z.uuid().optional().nullable(),
});

/**
 * Records a payment. With an account, the matching income/expense is booked in
 * that account's currency. One SQL function does both atomically and settles the
 * debt when fully repaid.
 */
export async function recordDebtPayment(input: z.input<typeof paymentSchema>): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_debt_payment", {
    p_debt: parsed.data.debt_id,
    p_amount: parsed.data.amount,
    p_paid_on: parsed.data.paid_on,
    p_account: parsed.data.account_id ?? null,
  });
  if (error) return fail(error.message);
  revalidate();
  return ok(undefined);
}

export async function deleteDebt(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("debts").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok(undefined);
}

export async function reopenDebt(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("debts").update({ status: "open" }).eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok(undefined);
}
