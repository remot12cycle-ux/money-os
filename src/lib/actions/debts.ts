"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rateToBase } from "@/lib/money";
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

/**
 * Records a payment. If `account_id` is given, a matching transaction is
 * created (income when someone pays you back, expense when you pay).
 */
export async function recordDebtPayment(input: {
  debt_id: string;
  amount: number;
  paid_on: string;
  account_id?: string | null;
}): Promise<ActionResult> {
  if (!(input.amount > 0)) return fail("Amount must be above zero");
  const user = await requireUser();
  const supabase = await createClient();
  const { data: debt, error } = await supabase.from("debts").select("*").eq("id", input.debt_id).single();
  if (error || !debt) return fail("Debt not found");

  let transaction_id: string | null = null;
  if (input.account_id) {
    const { data: p } = await supabase.from("profiles").select("base_currency, usd_to_mad").eq("id", user.id).single();
    const fx = rateToBase(debt.currency, (p?.base_currency ?? "USD") as "USD" | "MAD", Number(p?.usd_to_mad ?? 10));
    const { data: tx, error: e2 } = await supabase
      .from("transactions")
      .insert({
        type: debt.direction === "owed_to_me" ? "income" : "expense",
        amount: input.amount,
        currency: debt.currency,
        fx_rate_to_base: fx,
        account_id: input.account_id,
        occurred_on: input.paid_on,
        note: `${debt.direction === "owed_to_me" ? "Repayment from" : "Repayment to"} ${debt.counterparty}`,
        source: "debt",
      })
      .select("id")
      .single();
    if (e2) return fail(e2.message);
    transaction_id = tx.id;
  }

  const { error: e3 } = await supabase
    .from("debt_payments")
    .insert({ debt_id: debt.id, amount: input.amount, paid_on: input.paid_on, transaction_id });
  if (e3) return fail(e3.message);

  const { data: paid } = await supabase.from("debt_payments").select("amount").eq("debt_id", debt.id);
  const total = (paid ?? []).reduce((a, p) => a + Number(p.amount), 0);
  if (total >= Number(debt.principal) - 0.005) {
    await supabase.from("debts").update({ status: "settled" }).eq("id", debt.id);
  }
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
