import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "@/lib/db";

// Jalankan migrasi + seed minimal, lalu buat database siap pakai.
// Dipanggil saat server start (lihat instrumentation.ts) — aman untuk
// single-user lokal karena idempotent (drizzle melacak migrasi yang sudah jalan).
export function runMigrations() {
  migrate(db, { migrationsFolder: "./drizzle" });
  sqlite.close();
}
