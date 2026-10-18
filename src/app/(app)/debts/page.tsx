import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DebtsView } from "./debts-view";

export const metadata: Metadata = { title: "Debts" };

export default async function DebtsPage() {
  const supabase = await createClient();
  const [{ data: debts }, { data: payments }] = await Promise.all([
    supabase.from("debts").select("*").order("status").order("due_on", { ascending: true, nullsFirst: false }),
    supabase.from("debt_payments").select("*").order("paid_on", { ascending: false }),
  ]);
  return <DebtsView debts={debts ?? []} payments={payments ?? []} />;
}
