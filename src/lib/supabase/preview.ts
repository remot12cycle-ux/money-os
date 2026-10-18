import "server-only";

import { createHmac } from "node:crypto";
import { createClient as createBareClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

/**
 * Local preview mode (development only). When MONEYOS_PREVIEW_SUB is set, the
 * app talks to a local PostgREST with a self-signed HS256 JWT and auth is
 * stubbed to that user. Never enabled in production builds on Vercel.
 */
export function previewSub(): string | null {
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) return null;
  return process.env.MONEYOS_PREVIEW_SUB ?? null;
}

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function mintJwt(sub: string) {
  const secret = process.env.MONEYOS_PREVIEW_JWT_SECRET ?? "";
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ sub, role: "authenticated", email: "preview@local", exp: Math.floor(Date.now() / 1000) + 3600 }),
  );
  const sig = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function createPreviewClient(sub: string) {
  const token = mintJwt(sub);
  const client = createBareClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );
  // Stub the two auth calls the app makes.
  const claims = { sub, role: "authenticated", email: "preview@local" };
  Object.assign(client.auth, {
    getClaims: async () => ({ data: { claims }, error: null }),
    signOut: async () => ({ error: null }),
  });
  return client;
}
