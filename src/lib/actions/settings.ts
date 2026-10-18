"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { fail, fromZod, ok, type ActionResult } from "./result";
import type { Theme } from "@/lib/db/types";

const revalidateAll = () => revalidatePath("/", "layout");

/* ───────── theme ───────── */
export async function setTheme(theme: Theme): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  (await cookies()).set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const { error } = await supabase.from("profiles").update({ theme }).eq("id", user.id);
  if (error) return fail(error.message);
  return ok(undefined);
}

/* ───────── profile ───────── */
const profileSchema = z.object({
  display_name: z.string().max(80).optional().nullable(),
  starting_capital: z.coerce.number().min(0),
  monthly_target: z.coerce.number().min(0),
  target_metric: z.enum(["net_profit", "revenue"]),
  usd_to_mad: z.coerce.number().positive("Rate must be positive"),
});
export type ProfileInput = z.input<typeof profileSchema>;

export async function saveProfile(input: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const user = await requireUser();
  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("usd_to_mad").eq("id", user.id).single();
  const rateChanged = before && Number(before.usd_to_mad) !== parsed.data.usd_to_mad;
  const { error } = await supabase
    .from("profiles")
    .update({
      ...parsed.data,
      display_name: parsed.data.display_name ?? null,
      ...(rateChanged ? { rate_updated_at: new Date().toISOString() } : {}),
    })
    .eq("id", user.id);
  if (error) return fail(error.message);
  // Keep the seeded opening-balance row in step with the starting capital so "vs start" stays honest.
  await supabase
    .from("transactions")
    .update({ amount: parsed.data.starting_capital })
    .eq("owner_id", user.id)
    .eq("source", "opening");
  revalidateAll();
  return ok(undefined);
}

export async function saveMonthlyTarget(input: {
  monthly_target: number;
  target_metric: "net_profit" | "revenue";
}): Promise<ActionResult> {
  const parsed = z
    .object({ monthly_target: z.coerce.number().min(0, "Target must be zero or more"), target_metric: z.enum(["net_profit", "revenue"]) })
    .safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ monthly_target: parsed.data.monthly_target, target_metric: parsed.data.target_metric })
    .eq("id", user.id);
  if (error) return fail(error.message);
  revalidateAll();
  return ok(undefined);
}

/** Pulls a live USD→MAD rate and stores it. Falls back gracefully. */
export async function refreshRate(): Promise<ActionResult<{ rate: number }>> {
  const user = await requireUser();
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=MAD", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`rate service ${res.status}`);
    const json = (await res.json()) as { rates?: { MAD?: number } };
    const rate = json.rates?.MAD;
    if (!rate) throw new Error("rate missing");
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ usd_to_mad: Number(rate.toFixed(4)), rate_updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) return fail(error.message);
    revalidateAll();
    return ok({ rate });
  } catch (e) {
    return fail(`Could not fetch a live rate (${(e as Error).message}). The previous rate is kept.`);
  }
}

/* ───────── entities ───────── */
const entitySchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1).max(60),
  kind: z.enum(["personal", "business", "salary"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour"),
  is_archived: z.boolean().optional(),
});
export type EntityInput = z.input<typeof entitySchema>;

export async function saveEntity(input: EntityInput): Promise<ActionResult> {
  const parsed = entitySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  if (v.id) {
    const { error } = await supabase
      .from("entities")
      .update({ name: v.name, kind: v.kind, color: v.color, is_archived: v.is_archived ?? false })
      .eq("id", v.id);
    if (error) return fail(error.message);
  } else {
    const { error } = await supabase
      .from("entities")
      .insert({ name: v.name, slug: slugify(v.name), kind: v.kind, color: v.color });
    if (error) return fail(error.message.includes("duplicate") ? "An entity with that name exists" : error.message);
  }
  revalidateAll();
  return ok(undefined);
}

export async function deleteEntity(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("entities").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidateAll();
  return ok(undefined);
}

/* ───────── categories ───────── */
const categorySchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1).max(60),
  kind: z.enum(["income", "expense"]),
  entity_id: z.uuid().optional().nullable(),
  is_archived: z.boolean().optional(),
});
export type CategoryInput = z.input<typeof categorySchema>;

export async function saveCategory(input: CategoryInput): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const row = { name: v.name, kind: v.kind, entity_id: v.entity_id ?? null, is_archived: v.is_archived ?? false };
  const { error } = v.id
    ? await supabase.from("categories").update(row).eq("id", v.id)
    : await supabase.from("categories").insert(row);
  if (error) return fail(error.message.includes("duplicate") ? "That category already exists" : error.message);
  revalidateAll();
  return ok(undefined);
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidateAll();
  return ok(undefined);
}

/* ───────── accounts ───────── */
const accountSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1).max(60),
  type: z.enum(["cash", "bank", "wallet", "card", "other"]),
  currency: z.enum(["USD", "MAD"]),
  is_archived: z.boolean().optional(),
});
export type AccountInput = z.input<typeof accountSchema>;

export async function saveAccount(input: AccountInput): Promise<ActionResult> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const row = { name: v.name, type: v.type, currency: v.currency, is_archived: v.is_archived ?? false };
  if (v.id) {
    // An account's currency is fixed once it holds transactions (balances would become meaningless).
    const { data: current } = await supabase.from("accounts").select("currency").eq("id", v.id).maybeSingle();
    if (current && current.currency !== v.currency) {
      const { count } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .or(`account_id.eq.${v.id},to_account_id.eq.${v.id}`);
      if (count && count > 0) return fail("This account already has transactions; its currency can't change. Create a new account instead.");
    }
  }
  const { error } = v.id
    ? await supabase.from("accounts").update(row).eq("id", v.id)
    : await supabase.from("accounts").insert(row);
  if (error) return fail(error.message);
  revalidateAll();
  return ok(undefined);
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error)
    return fail(
      error.message.includes("violates foreign key")
        ? "This account has transactions. Archive it instead."
        : error.message,
    );
  revalidateAll();
  return ok(undefined);
}

/* ───────── API keys ───────── */
export async function createApiKey(name: string): Promise<ActionResult<{ key: string }>> {
  if (!name.trim()) return fail("Name the key (e.g. 'Facebook ads bot')");
  const supabase = await createClient();
  const raw = `mos_${randomBytes(24).toString("base64url")}`;
  const key_hash = createHash("sha256").update(raw).digest("hex");
  const { error } = await supabase
    .from("api_keys")
    .insert({ name: name.trim(), key_hash, key_prefix: raw.slice(0, 12) });
  if (error) return fail(error.message);
  revalidatePath("/settings");
  return ok({ key: raw });
}

export async function revokeApiKey(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/settings");
  return ok(undefined);
}

/* ───────── recurring rules ───────── */
const recurringSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().min(1).max(120),
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().min(0),
  currency: z.enum(["USD", "MAD"]),
  account_id: z.uuid(),
  category_id: z.uuid().optional().nullable(),
  entity_id: z.uuid().optional().nullable(),
  cadence: z.enum(["weekly", "monthly", "yearly"]),
  next_run_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_active: z.boolean().optional(),
});
export type RecurringInput = z.input<typeof recurringSchema>;

export async function saveRecurring(input: RecurringInput): Promise<ActionResult> {
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const row = {
    title: v.title,
    type: v.type,
    amount: v.amount,
    currency: v.currency,
    account_id: v.account_id,
    category_id: v.category_id ?? null,
    entity_id: v.entity_id ?? null,
    cadence: v.cadence,
    next_run_on: v.next_run_on,
    day_of_month: Number(v.next_run_on.slice(8, 10)),
    is_active: v.is_active ?? true,
  };
  const { error } = v.id
    ? await supabase.from("recurring_rules").update(row).eq("id", v.id)
    : await supabase.from("recurring_rules").insert(row);
  if (error) return fail(error.message);
  revalidatePath("/settings");
  return ok(undefined);
}

export async function deleteRecurring(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_rules").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/settings");
  return ok(undefined);
}
