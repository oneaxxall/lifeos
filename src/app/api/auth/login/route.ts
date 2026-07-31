import { NextRequest, NextResponse } from "next/server";
import {
  checkCredentials,
  createSessionToken,
  isHttpsRequest,
  sessionCookieHeader,
} from "@/lib/auth";

/** POST /api/auth/login — verifikasi kredensial dari .env, set cookie session. */
export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body tidak valid" }, { status: 400 });
  }

  const username = (body.username ?? "").trim();
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "Username dan password wajib diisi" }, { status: 400 });
  }

  const ok = checkCredentials(username, password);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Username atau password salah" }, { status: 401 });
  }

  const token = createSessionToken();
  const secure = isHttpsRequest(
    req.nextUrl.protocol,
    req.headers.get("x-forwarded-proto")
  );
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", sessionCookieHeader(token, secure));
  return res;
}
