import { NextRequest, NextResponse } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth-edge";

/**
 * Proteksi halaman LifeOS — tanpa database, kredensial dari .env.
 * Semua rute dilindungi kecuali /login, aset statis, manifest, dan API auth.
 * Redirect ke /login?next=... jika session tidak valid.
 * (Konvensi Next 16.2: file proxy — pengganti middleware, runtime edge.)
 */
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Halaman login: jika sudah login → lempar ke beranda
  if (pathname === "/login") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (await isValidSession(token)) {
      const next = req.nextUrl.searchParams.get("next") || "/";
      return NextResponse.redirect(new URL(next, req.url));
    }
    return NextResponse.next();
  }

  // Rute lain: wajib session valid
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!(await isValidSession(token))) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Jalankan untuk semua rute kecuali aset statis & API auth
  matcher: [
    /*
     * Semua rute kecuali:
     * - _next/static, _next/image, favicon, icon, manifest, sw, aset publik
     * - api/auth (login/logout harus publik)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js|api/auth|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt)).*)",
  ],
};
