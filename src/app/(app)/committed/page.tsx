import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getNetWorth } from "@/lib/data/dashboard";
import { CommittedView } from "./committed-view";

export const metadata: Metadata = { title: "Committed" };

export default async function CommittedPage() {
  const supabase = await createClient();
  const [{ data }, nw] = await Promise.all([
    supabase
      .from("committed_payables")
      .select("*")
      .order("status")
      .order("due_on", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    getNetWorth(),
  ]);
  return <CommittedView items={data ?? []} netWorth={nw} />;
}
