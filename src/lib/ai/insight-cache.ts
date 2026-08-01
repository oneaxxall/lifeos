import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { insightCache } from "@/lib/db/schema";

/**
 * Cache hasil analisa AI — PERSISTEN di SQLite (tabel insight_cache).
 * Tujuan: hindari panggilan LLM berulang saat user bolak-balik menu —
 * hasil analisa tidak berubah signifikan dalam 15 menit.
 *
 * Kenapa SQLite (bukan Map memori):
 * - Tahan restart server / hot-reload dev → panel insight tetap INSTAN
 * - Berlaku untuk semua fitur yang pakai cachedAnalyze (11 route)
 * - Map memori tetap dipakai sebagai fallback super-cepat + saat DB error
 *
 * Key per route + tanggal → brief harian tetap segar per hari.
 */

const TTL_MS = 15 * 60 * 1000;

/** Fallback memori (super cepat, per process) */
const memCache = new Map<string, { expiresAt: number; value: unknown }>();

export function cacheKey(route: string): string {
  return `${route}:${new Date().toISOString().slice(0, 10)}`;
}

/** Parse datetime('now') UTC → timestamp. */
function parseCreatedAt(raw: string): number {
  const d = new Date(raw.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/** Jalankan fn() dan simpan hasilnya di cache (SQLite + memori) selama TTL.
 *  `fresh=true` → LEWATI cache, generate ulang sekarang (force refresh). */
export async function cachedAnalyze<T>(
  key: string,
  fn: () => Promise<T>,
  opts?: { fresh?: boolean }
): Promise<T> {
  const now = Date.now();
  const fresh = opts?.fresh === true;

  if (!fresh) {
    // 1. Cek memori — super cepat
    const memHit = memCache.get(key);
    if (memHit && memHit.expiresAt > now) {
      return memHit.value as T;
    }

    // 2. Cek SQLite — tahan restart
    try {
      const row = db
        .select()
        .from(insightCache)
        .where(eq(insightCache.key, key))
        .get();
      if (row) {
        const created = parseCreatedAt(row.createdAt);
        if (now - created < TTL_MS) {
          const val = JSON.parse(row.value) as T;
          memCache.set(key, { expiresAt: now + TTL_MS, value: val });
          return val;
        }
        // Expired → hapus, generate ulang
        try {
          db.delete(insightCache).where(eq(insightCache.key, key)).run();
        } catch {
          // ignore
        }
      }
    } catch {
      // DB belum ada tabel / error → lanjut generate (fallback memori tetap jalan)
    }
  }

  // 3. Generate (panggilan LLM/heuristik)
  const value = await fn();
  memCache.set(key, { expiresAt: now + TTL_MS, value });

  // 4. Simpan ke SQLite — upsert (key = PK)
  try {
    db.insert(insightCache)
      .values({ key, value: JSON.stringify(value) })
      .onConflictDoUpdate({
        target: insightCache.key,
        set: {
          value: JSON.stringify(value),
          createdAt: sql`(datetime('now'))`,
        },
      })
      .run();
  } catch {
    // DB error → cache hanya di memori (behavior lama, tidak fatal)
  }

  return value;
}

/** Bersihkan cache lama (opsional — bisa dipanggil dari halaman Backup). */
export function clearInsightCache(): number {
  try {
    const cutoff = new Date(Date.now() - TTL_MS).toISOString().replace("T", " ").slice(0, 19);
    const res = db
      .delete(insightCache)
      .where(sql`created_at < ${cutoff}`)
      .run();
    return res.changes;
  } catch {
    return 0;
  }
}
