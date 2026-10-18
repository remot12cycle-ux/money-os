import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listTransactions } from "@/lib/data/transactions";

export const runtime = "nodejs";

function csvCell(v: unknown) {
  let s = v == null ? "" : String(v);
  // Spreadsheets treat leading = + - @ (and tab/CR) as formulas; neutralise user-supplied text.
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [txs, { data: accounts }, { data: entities }, { data: categories }] = await Promise.all([
    listTransactions({ limit: 100_000 }),
    supabase.from("accounts").select("id, name"),
    supabase.from("entities").select("id, name"),
    supabase.from("categories").select("id, name"),
  ]);
  const name = (rows: { id: string; name: string }[] | null, id: string | null) =>
    id ? (rows?.find((r) => r.id === id)?.name ?? "") : "";

  const header = ["date", "type", "amount", "currency", "amount_base", "fx_rate", "account", "to_account", "entity", "category", "note", "source", "external_id", "meta"];
  const lines = [header.join(",")];
  for (const t of txs) {
    lines.push(
      [
        t.occurred_on,
        t.type,
        t.amount,
        t.currency,
        t.amount_base,
        t.fx_rate_to_base,
        name(accounts, t.account_id),
        name(accounts, t.to_account_id),
        name(entities, t.entity_id),
        name(categories, t.category_id),
        t.note,
        t.source,
        t.external_id,
        JSON.stringify(t.meta ?? {}),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="money-os-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
