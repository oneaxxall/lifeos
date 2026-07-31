import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "@/lib/db";

// Jalankan migrasi + seed minimal, lalu buat database siap pakai.
// Dipanggil saat server start (lihat instrumentation.ts) — aman untuk
// single-user lokal karena idempotent (drizzle melacak migrasi yang sudah jalan).
export function runMigrations() {
  // CATATAN: JANGAN tutup koneksi sqlite di sini — di production (standalone)
  // modul hanya dievaluasi sekali; menutup koneksi membuat semua query berikutnya gagal.
  migrate(db, { migrationsFolder: "./drizzle" });
}
