import "server-only";

import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  AccountBalanceRow,
  AccountRow,
  CategoryRow,
  EntityRow,
  ProfileRow,
} from "@/lib/db/types";

/**
 * Reference data every screen needs. Wrapped in React `cache` so a single
 * request renders many components without re-querying.
 */
export const getProfile = cache(async (): Promise<ProfileRow> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data;
  // First login: seed everything, then read again.
  const { error } = await supabase.rpc("setup_owner");
  if (error) throw new Error(`setup_owner failed: ${error.message}`);
  const { data: fresh, error: e2 } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (e2 || !fresh) throw new Error("Profile could not be created");
  return fresh;
});

export const getEntities = cache(async (): Promise<EntityRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entities")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data ?? [];
});

export const getCategories = cache(async (): Promise<CategoryRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data ?? [];
});

export const getAccounts = cache(async (): Promise<AccountRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data ?? [];
});

export const getAccountBalances = cache(async (): Promise<AccountBalanceRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("account_balances").select("*");
  if (error) throw error;
  return data ?? [];
});

export type RefData = {
  profile: ProfileRow;
  entities: EntityRow[];
  categories: CategoryRow[];
  accounts: AccountRow[];
};

export const getRefData = cache(async (): Promise<RefData> => {
  const profile = await getProfile(); // ensures seed ran first
  const [entities, categories, accounts] = await Promise.all([
    getEntities(),
    getCategories(),
    getAccounts(),
  ]);
  return { profile, entities, categories, accounts };
});
