import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({ ok: true, configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("example")) });
}
