import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookieHeader, isHttpsRequest } from "@/lib/auth";

/** POST /api/auth/logout — hapus cookie session. */
export async function POST(req: NextRequest) {
  const secure = isHttpsRequest(
    req.nextUrl.protocol,
    req.headers.get("x-forwarded-proto")
  );
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookieHeader(secure));
  return res;
}
