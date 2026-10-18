import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { findByNameOrSlug, normalizeBody } from "@/lib/ingest";
import { rateToBase } from "@/lib/money";

export const runtime = "nodejs";

function bearer(req: NextRequest) {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() ?? null;
}

export async function POST(req: NextRequest) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Ingest is not configured on the server" }, { status: 503 });
  }

  const key_hash = createHash("sha256").update(token).digest("hex");
  const { data: key } = await supabase
    .from("api_keys")
    .select("id, owner_id, revoked_at")
    .eq("key_hash", key_hash)
    .maybeSingle();
  if (!key || key.revoked_at) return NextResponse.json({ error: "Invalid or revoked key" }, { status: 401 });
  const owner = key.owner_id;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = normalizeBody(raw);
  if (!parsed.ok) return NextResponse.json({ error: "Validation failed", details: parsed.errors }, { status: 422 });

  const [{ data: profile }, { data: entities }, { data: categories }, { data: accounts }] = await Promise.all([
    supabase.from("profiles").select("base_currency, usd_to_mad").eq("id", owner).single(),
    supabase.from("entities").select("id, name, slug").eq("owner_id", owner),
    supabase.from("categories").select("id, name, kind").eq("owner_id", owner),
    supabase.from("accounts").select("id, name, currency, is_archived").eq("owner_id", owner),
  ]);
  if (!profile) return NextResponse.json({ error: "Owner profile missing" }, { status: 500 });
  const base = profile.base_currency as "USD" | "MAD";
  const rate = Number(profile.usd_to_mad);
  const cats = [...(categories ?? [])];

  const results: { index: number; status: number; id?: string; updated?: boolean; error?: string }[] = [];

  for (const [index, item] of parsed.items.entries()) {
    const entity = findByNameOrSlug(entities ?? [], item.entity);
    const account =
      findByNameOrSlug((accounts ?? []).filter((a) => !a.is_archived), item.account) ??
      (accounts ?? []).find((a) => !a.is_archived && a.currency === item.currency) ??
      (accounts ?? []).find((a) => !a.is_archived);
    if (!account) {
      results.push({ index, status: 422, error: "No account available" });
      continue;
    }

    let category_id: string | null = null;
    if (item.category) {
      const existing = cats.find((c) => c.name.toLowerCase() === item.category!.toLowerCase() && c.kind === item.type);
      if (existing) category_id = existing.id;
      else {
        const { data: created } = await supabase
          .from("categories")
          .insert({ owner_id: owner, name: item.category, kind: item.type, sort_order: 99 })
          .select("id, name, kind")
          .single();
        if (created) {
          cats.push(created);
          category_id = created.id;
        }
      }
    }

    const row = {
      owner_id: owner,
      type: item.type,
      amount: item.amount,
      currency: item.currency,
      fx_rate_to_base: rateToBase(item.currency, base, rate),
      account_id: account.id,
      category_id,
      entity_id: entity?.id ?? null,
      occurred_on: item.occurred_on ?? new Date().toISOString().slice(0, 10),
      note: item.note ?? null,
      source: "ingest" as const,
      external_id: item.external_id ?? null,
      meta: (item.meta ?? {}) as Record<string, never>,
    };

    if (row.external_id) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("owner_id", owner)
        .eq("external_id", row.external_id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from("transactions").update(row).eq("id", existing.id);
        results.push(error ? { index, status: 500, error: error.message } : { index, status: 200, id: existing.id, updated: true });
        continue;
      }
    }
    const { data, error } = await supabase.from("transactions").insert(row).select("id").single();
    results.push(error ? { index, status: 500, error: error.message } : { index, status: 201, id: data.id });
  }

  await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);

  if (results.length === 1) {
    const r = results[0]!;
    return NextResponse.json(r.error ? { error: r.error } : { id: r.id, updated: r.updated ?? false }, { status: r.status });
  }
  const worst = Math.max(...results.map((r) => r.status));
  return NextResponse.json({ results }, { status: worst >= 500 ? 207 : worst >= 422 ? 207 : 200 });
}
