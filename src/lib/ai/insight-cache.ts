import { NextResponse } from "next/server";

/**
 * Cache hasil analisa AI di memori (TTL 15 menit).
 * Tujuan: hindari panggilan LLM berulang saat user bolak-balik menu —
 * hasil analisa tidak berubah signifikan dalam 15 menit.
 *
 * Key per route + tanggal → brief harian tetap segar per hari.
 */
const cache = new Map<string, { expiresAt: number; value: NextResponse }>();

const TTL_MS = 15 * 60 * 1000;

export function cacheKey(route: string): string {
  return `${route}:${new Date().toISOString().slice(0, 10)}`;
}

/** Jalankan fn() dan simpan hasilnya di cache selama TTL. */
export async function cachedAnalyze<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }
  const value = await fn();
  cache.set(key, { expiresAt: now + TTL_MS, value });
  return value;
}

/** Hapus cache route (dipanggil setelah data berubah, mis. transaksi baru). */
export function invalidateCache(routePrefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(routePrefix)) cache.delete(key);
  }
}
