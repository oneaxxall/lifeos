import { and, asc, desc, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { journalEntries, moodEntries } from "@/lib/db/schema";

/** Entri mood terbaru dulu */
export function listMoods(limit = 90) {
  return db
    .select()
    .from(moodEntries)
    .orderBy(desc(moodEntries.date))
    .limit(limit)
    .all();
}

/** Entri mood ascending (untuk chart) */
export function listMoodsAsc(limit = 90) {
  return db
    .select()
    .from(moodEntries)
    .orderBy(asc(moodEntries.date))
    .limit(limit)
    .all();
}

/** Jurnal terbaru dulu */
export function listJournals(limit = 50) {
  return db
    .select()
    .from(journalEntries)
    .orderBy(desc(journalEntries.date), desc(journalEntries.id))
    .limit(limit)
    .all();
}

/** Mood rata-rata rentang tertentu */
export function avgMood(from: string, to: string): number {
  const rows = db
    .select()
    .from(moodEntries)
    .where(and(gte(moodEntries.date, from), lte(moodEntries.date, to)))
    .all();
  if (rows.length === 0) return 0;
  return rows.reduce((s, r) => s + r.mood, 0) / rows.length;
}
