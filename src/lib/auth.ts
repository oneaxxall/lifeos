import "server-only";
import crypto from "node:crypto";

/**
 * Auth LifeOS tanpa database — kredensial dari .env:
 *   AUTH_USERNAME, AUTH_PASSWORD, AUTH_SECRET
 * Session: cookie httpOnly berisi token HMAC-signed (exp 7 hari).
 * Verifikasi sinkron (crypto) — aman dipakai di route handler & middleware.
 */

export const SESSION_COOKIE = "lifeos_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET belum di-set di .env (min 16 karakter)");
  }
  return secret;
}

function getCredentials(): { username: string; password: string } {
  const username = process.env.AUTH_USERNAME ?? "";
  const password = process.env.AUTH_PASSWORD ?? "";
  return { username, password };
}

/** Cek kredensial dari .env (timing-safe) */
export function checkCredentials(username: string, password: string): boolean {
  const { username: envUser, password: envPass } = getCredentials();
  if (!envUser || !envPass) return false;
  const a = Buffer.from(username);
  const b = Buffer.from(envUser);
  const c = Buffer.from(password);
  const d = Buffer.from(envPass);
  // timingSafeEqual melempar error jika panjang beda — cek panjang dulu
  if (a.length !== b.length || c.length !== d.length) return false;
  const userOk = crypto.timingSafeEqual(a, b);
  const passOk = crypto.timingSafeEqual(c, d);
  return userOk && passOk;
}

interface SessionPayload {
  sub: string;
  exp: number;
}

function sign(payload: SessionPayload): string {
  const secret = getSecret();
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string): SessionPayload | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const secret = getSecret();
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Buat token session baru (7 hari). */
export function createSessionToken(): string {
  return sign({
    sub: "lifeos-user",
    exp: Date.now() + SESSION_TTL_MS,
  });
}

/** Validasi cookie session. */
export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  return verify(token) !== null;
}

/** Header Set-Cookie untuk session (httpOnly, sameSite, secure di prod). */
export function sessionCookieHeader(token: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_MS / 1000}`,
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

/** Header untuk menghapus cookie (logout). */
export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
