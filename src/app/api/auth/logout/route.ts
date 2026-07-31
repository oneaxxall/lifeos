import { NextResponse } from "next/server";
import { clearSessionCookieHeader } from "@/lib/auth";

/** POST /api/auth/logout — hapus cookie session. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookieHeader());
  return res;
}
