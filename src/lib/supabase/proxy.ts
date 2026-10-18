import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/ingest", "/api/cron", "/api/health"];

function supabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!key || key === "REPLACE-ME" || /REPLACE-ME|example\./.test(url)) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Not wired to Supabase yet (fresh deploy): show the setup guide instead of crashing.
  if (!supabaseConfigured() && !(process.env.MONEYOS_PREVIEW_SUB && process.env.NODE_ENV === "development")) {
    if (pathname === "/setup" || pathname.startsWith("/api/health")) return supabaseResponse;
    return NextResponse.redirect(new URL("/setup", request.url));
  }
  if (pathname === "/setup") return NextResponse.redirect(new URL("/", request.url));

  // Local preview mode: no real auth server, everyone is the preview owner.
  if (process.env.MONEYOS_PREVIEW_SUB && process.env.NODE_ENV === "development") {
    if (request.nextUrl.pathname === "/login") return NextResponse.redirect(new URL("/", request.url));
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the session cookie if needed and verifies the JWT signature.
  const { data } = await supabase.auth.getClaims();
  const isAuthed = Boolean(data?.claims?.sub);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!isAuthed && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthed && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
