import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getRefData } from "@/lib/data/core";
import { PageHeader } from "@/components/ui/primitives";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const [ref, keys, recurring] = await Promise.all([
    getRefData(),
    supabase.from("api_keys").select("id, name, key_prefix, last_used_at, revoked_at, created_at").order("created_at", { ascending: false }),
    supabase.from("recurring_rules").select("*").order("next_run_on"),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" />
      <SettingsView apiKeys={keys.data ?? []} recurring={recurring.data ?? []} refData={ref} />
    </div>
  );
}
