"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, fromZod, ok, type ActionResult } from "./result";

const revalidate = () => ["/", "/budgets"].forEach((p) => revalidatePath(p));

export async function setBudget(input: {
  category_id: string;
  month: string; // yyyy-mm
  amount_base: number;
}): Promise<ActionResult> {
  const parsed = z
    .object({
      category_id: z.uuid(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
      amount_base: z.coerce.number().min(0),
    })
    .safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const month = `${parsed.data.month}-01`;
  if (parsed.data.amount_base === 0) {
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("category_id", parsed.data.category_id)
      .eq("month", month);
    if (error) return fail(error.message);
  } else {
    const { data: existing } = await supabase
      .from("budgets")
      .select("id")
      .eq("category_id", parsed.data.category_id)
      .eq("month", month)
      .maybeSingle();
    const { error } = existing
      ? await supabase.from("budgets").update({ amount_base: parsed.data.amount_base }).eq("id", existing.id)
      : await supabase.from("budgets").insert({ category_id: parsed.data.category_id, month, amount_base: parsed.data.amount_base });
    if (error) return fail(error.message);
  }
  revalidate();
  return ok(undefined);
}

export async function copyBudgetsFromPreviousMonth(month: string): Promise<ActionResult<{ copied: number }>> {
  if (!/^\d{4}-\d{2}$/.test(month)) return fail("Invalid month");
  const supabase = await createClient();
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  const prev = d.toISOString().slice(0, 7);
  const { data: src, error } = await supabase.from("budgets").select("category_id, amount_base").eq("month", `${prev}-01`);
  if (error) return fail(error.message);
  if (!src?.length) return fail(`No budgets in ${prev} to copy`);
  const rows = src.map((b) => ({ category_id: b.category_id, amount_base: b.amount_base, month: `${month}-01` }));
  const { error: e2 } = await supabase.from("budgets").upsert(rows, { onConflict: "owner_id,category_id,month" });
  if (e2) return fail(e2.message);
  revalidate();
  return ok({ copied: rows.length });
}

/* ───────── goals ───────── */
const goalSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().min(1).max(100),
  target_amount_base: z.coerce.number().positive("Target must be above zero"),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});
export type GoalInput = z.input<typeof goalSchema>;

export async function saveGoal(input: GoalInput): Promise<ActionResult> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const row = { title: v.title, target_amount_base: v.target_amount_base, deadline: v.deadline ?? null };
  const { error } = v.id
    ? await supabase.from("goals").update(row).eq("id", v.id)
    : await supabase.from("goals").insert(row);
  if (error) return fail(error.message);
  revalidate();
  return ok(undefined);
}

export async function contributeToGoal(id: string, amount: number): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid(), amount: z.number().finite().refine((n) => n !== 0, "Enter an amount") }).safeParse({ id, amount });
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const { data: g, error } = await supabase.from("goals").select("current_amount_base, target_amount_base").eq("id", id).single();
  if (error || !g) return fail("Goal not found");
  const current = Math.max(0, +(Number(g.current_amount_base) + amount).toFixed(2));
  const { error: e2 } = await supabase
    .from("goals")
    .update({ current_amount_base: current, is_done: current >= Number(g.target_amount_base) })
    .eq("id", id);
  if (e2) return fail(e2.message);
  revalidate();
  return ok(undefined);
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok(undefined);
}
