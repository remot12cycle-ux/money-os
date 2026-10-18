import { NextResponse, type NextRequest } from "next/server";
import { addMonths, addWeeks, addYears, format, parseISO } from "date-fns";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { rateToBase } from "@/lib/money";
import type { Database } from "@/lib/db/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Client = SupabaseClient<Database>;

function nextDate(iso: string, cadence: "weekly" | "monthly" | "yearly") {
  const d = parseISO(iso);
  const n = cadence === "weekly" ? addWeeks(d, 1) : cadence === "monthly" ? addMonths(d, 1) : addYears(d, 1);
  return format(n, "yyyy-MM-dd");
}

/** Materialises every due rule (next_run_on <= today) into transactions. Loops to catch up missed periods. */
async function runDue(supabase: Client, ownerFilter?: string) {
  const today = new Date().toISOString().slice(0, 10);
  let q = supabase.from("recurring_rules").select("*").eq("is_active", true).lte("next_run_on", today);
  if (ownerFilter) q = q.eq("owner_id", ownerFilter);
  const { data: rules, error } = await q;
  if (error) throw error;

  const profiles = new Map<string, { base: "USD" | "MAD"; rate: number }>();
  let created = 0;

  for (const rule of rules ?? []) {
    if (!profiles.has(rule.owner_id)) {
      const { data: p } = await supabase.from("profiles").select("base_currency, usd_to_mad").eq("id", rule.owner_id).single();
      profiles.set(rule.owner_id, { base: (p?.base_currency ?? "USD") as "USD" | "MAD", rate: Number(p?.usd_to_mad ?? 10) });
    }
    const { base, rate } = profiles.get(rule.owner_id)!;
    let run = rule.next_run_on;
    let guard = 0;
    while (run <= today && guard++ < 60) {
      const external_id = `recurring:${rule.id}:${run}`;
      const { data: exists } = await supabase
        .from("transactions")
        .select("id")
        .eq("owner_id", rule.owner_id)
        .eq("external_id", external_id)
        .maybeSingle();
      if (!exists) {
        const { error: e } = await supabase.from("transactions").insert({
          owner_id: rule.owner_id,
          type: rule.type,
          amount: rule.amount,
          currency: rule.currency,
          fx_rate_to_base: rateToBase(rule.currency, base, rate),
          account_id: rule.account_id,
          category_id: rule.category_id,
          entity_id: rule.entity_id,
          occurred_on: run,
          note: rule.title,
          source: "recurring",
          external_id,
        });
        if (!e) created++;
      }
      run = nextDate(run, rule.cadence);
    }
    await supabase.from("recurring_rules").update({ next_run_on: run }).eq("id", rule.id);
  }
  return created;
}

/** Vercel cron (GET with CRON_SECRET) — runs for every owner via the service role. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const created = await runDue(createServiceClient());
    return NextResponse.json({ ok: true, created });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** Manual trigger from Settings — runs for the signed-in owner only, under RLS. */
export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const created = await runDue(supabase, sub);
    return NextResponse.json({ ok: true, created });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
