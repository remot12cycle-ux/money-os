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
  ProjectRow,
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

export const getProjects = cache(async (): Promise<ProjectRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order")
    .order("created_at");
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
  projects: ProjectRow[];
};

export const getRefData = cache(async (): Promise<RefData> => {
  // One parallel round trip. getProfile seeds on first login; in that rare case
  // the other lists were read before the seed, so read them again.
  const supabase = await createClient();
  const [profile, entities, categories, accounts, projects] = await Promise.all([
    getProfile(),
    getEntities(),
    getCategories(),
    getAccounts(),
    getProjects(),
  ]);
  if (entities.length === 0) {
    const [e, c, a] = await Promise.all([
      supabase.from("entities").select("*").order("sort_order").order("name"),
      supabase.from("categories").select("*").order("sort_order").order("name"),
      supabase.from("accounts").select("*").order("sort_order").order("name"),
    ]);
    return { profile, entities: e.data ?? [], categories: c.data ?? [], accounts: a.data ?? [], projects };
  }
  return { profile, entities, categories, accounts, projects };
});
