import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string | null };

/** Data-access-layer entry point: verified user or redirect to /login. */
export const requireUser = cache(async function requireUser(): Promise<SessionUser> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) redirect("/login");
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { id: sub, email };
});
