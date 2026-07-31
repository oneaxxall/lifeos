import fs from "node:fs";
import path from "node:path";
import { sqlite } from "@/lib/db";

/**
 * Backup & Restore LifeOS — semua tabel diekspor ke JSON.
 * File backup disimpan di data/backups/ (folder lokal, gitignored).
 */

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

export interface BackupStatsRow {
  table: string;
  count: number;
}

export interface BackupFile {
  name: string;
  size: number;
  createdAt: string;
}

const APP_TABLES = [
  "knowledge",
  "categories",
  "tags",
  "knowledge_categories",
  "knowledge_tags",
  "embeddings",
  "todos",
  "finance_categories",
  "finance_transactions",
  "subscriptions",
  "budgets",
  "activity_categories",
  "activities",
  "time_blocks",
  "health_entries",
  "health_goals",
  "mood_entries",
  "journal_entries",
  "sick_entries",
  "family_entries",
  "spiritual_entries",
  "spiritual_goals",
  "business_ideas",
  "business_projects",
  "contacts",
  "team_members",
  "team_one_on_ones",
  "team_feedback",
  "insights",
  "insight_feedback",
];

function ensureDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/** Statistik jumlah baris per tabel aplikasi. */
export function getBackupStats(): { tables: BackupStatsRow[]; total: number } {
  const tables: BackupStatsRow[] = [];
  let total = 0;
  for (const table of APP_TABLES) {
    try {
      const row = sqlite
        .prepare(`SELECT COUNT(*) AS c FROM "${table}"`)
        .get() as { c: number };
      tables.push({ table, count: row.c });
      total += row.c;
    } catch {
      // tabel belum ada (migrasi belum jalan) — skip
    }
  }
  return { tables, total };
}

/** Dump semua tabel ke objek JSON. */
export function dumpAllTables(): Record<string, unknown[]> {
  const data: Record<string, unknown[]> = {};
  for (const table of APP_TABLES) {
    try {
      data[table] = sqlite.prepare(`SELECT * FROM "${table}"`).all();
    } catch {
      data[table] = [];
    }
  }
  return data;
}

/** Simpan backup ke file lokal + return metadata. */
export function saveBackupFile(
  payload: Record<string, unknown[]>
): BackupFile {
  ensureDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const name = `lifeos-backup-${stamp}.json`;
  const filePath = path.join(BACKUP_DIR, name);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  const stat = fs.statSync(filePath);
  return { name, size: stat.size, createdAt: new Date().toISOString() };
}

/** Daftar file backup lokal (terbaru dulu). */
export function listBackupFiles(): BackupFile[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        name: f,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Baca isi file backup lokal. */
export function readBackupFile(name: string): Record<string, unknown[]> | null {
  const filePath = path.join(BACKUP_DIR, name);
  if (!filePath.startsWith(BACKUP_DIR) || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

/** Hapus file backup lokal. */
export function deleteBackupFile(name: string): boolean {
  const filePath = path.join(BACKUP_DIR, name);
  if (!filePath.startsWith(BACKUP_DIR) || !fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

/**
 * Restore: bersihkan semua tabel aplikasi, lalu isi ulang dari payload.
 * Berjalan dalam SATU transaksi — jika gagal di tengah, rollback total.
 */
export function restoreFromPayload(
  payload: Record<string, unknown[]>
): { ok: boolean; tablesRestored: number; rowsRestored: number; error?: string } {
  const run = sqlite.transaction(() => {
    // 1. Kosongkan semua tabel (dari list saat ini — tidak hanya yang ada di payload)
    for (const table of APP_TABLES) {
      try {
        sqlite.prepare(`DELETE FROM "${table}"`).run();
      } catch {
        // tabel belum ada — skip
      }
    }
    // Reset autoincrement
    try {
      sqlite.prepare("DELETE FROM sqlite_sequence").run();
    } catch {
      // tidak ada sequence
    }

    // 2. Isi ulang dari payload (hanya tabel yang dikenal + valid)
    let rowsRestored = 0;
    for (const table of APP_TABLES) {
      const rows = payload[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const first = rows[0] as Record<string, unknown>;
      const cols = Object.keys(first ?? {});
      if (cols.length === 0) continue;
      const placeholders = cols.map(() => "?").join(", ");
      const insert = sqlite.prepare(
        `INSERT OR REPLACE INTO "${table}" (${cols
          .map((c) => `"${c}"`)
          .join(", ")}) VALUES (${placeholders})`
      );
      for (const row of rows) {
        insert.run(...cols.map((c) => (row as Record<string, unknown>)[c]));
      }
      rowsRestored += rows.length;
    }
    return rowsRestored;
  });

  try {
    const rowsRestored = run();
    return { ok: true, tablesRestored: Object.keys(payload).length, rowsRestored };
  } catch (e) {
    return {
      ok: false,
      tablesRestored: 0,
      rowsRestored: 0,
      error: e instanceof Error ? e.message : "Gagal restore",
    };
  }
}
