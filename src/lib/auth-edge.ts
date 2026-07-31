/**
 * Verifikasi session untuk proxy (edge runtime) — WebCrypto crypto.subtle.
 * Format token sama dengan src/lib/auth.ts (node): base64url(payload).base64url(HMAC-SHA256).
 * Ini berjalan di EDGE — tidak boleh import node:crypto / server-only.
 */

export const SESSION_COOKIE = "lifeos_session";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 16) return "";
  return secret;
}

async function importKey(secret: string): Promise<CryptoKey | null> {
  try {
    const enc = new TextEncoder().encode(secret);
    return await crypto.subtle.importKey(
      "raw",
      enc,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
  } catch {
    return null;
  }
}

/** Validasi cookie session (async, edge-safe). */
export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;

  const secret = getSecret();
  if (!secret) return false;
  const key = await importKey(secret);
  if (!key) return false;

  try {
    const enc = new TextEncoder();
    const data = enc.encode(body);
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
      c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, data);
    if (!valid) return false;

    // Cek expiry
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(body.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
          c.charCodeAt(0)
        )
      )
    ) as { exp?: number };
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}
