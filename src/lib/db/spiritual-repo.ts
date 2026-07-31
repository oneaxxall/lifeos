import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { spiritualEntries, spiritualGoals } from "@/lib/db/schema";
import { computeSpiritualStats } from "@/lib/spiritual-stats";

export { computeSpiritualStats, type SpiritualStats } from "@/lib/spiritual-stats";

/** Entri spiritual terbaru dulu */
export function listSpiritualEntries(limit = 120) {
  return db
    .select()
    .from(spiritualEntries)
    .orderBy(desc(spiritualEntries.date))
    .limit(limit)
    .all();
}

/** Entri spiritual ascending (untuk chart/streak) */
export function listSpiritualAsc(limit = 120) {
  return db
    .select()
    .from(spiritualEntries)
    .orderBy(asc(spiritualEntries.date))
    .limit(limit)
    .all();
}

/** Target spiritual (single row) */
export function getSpiritualGoals() {
  return db.select().from(spiritualGoals).limit(1).get() ?? null;
}

export function upsertSpiritualGoals(goals: Partial<typeof spiritualGoals.$inferInsert>) {
  const existing = getSpiritualGoals();
  if (existing) {
    return db
      .update(spiritualGoals)
      .set(goals)
      .where(eq(spiritualGoals.id, existing.id))
      .returning()
      .get();
  }
  return db.insert(spiritualGoals).values(goals).returning().get();
}

/** Hitung streak & statistik spiritual dari riwayat (server wrapper). */
export function computeSpiritualStatsServer(entries: ReturnType<typeof listSpiritualAsc>) {
  return computeSpiritualStats(entries);
}
