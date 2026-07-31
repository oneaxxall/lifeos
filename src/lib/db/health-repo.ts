import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { healthEntries, healthGoals } from "@/lib/db/schema";

/** Entri kesehatan terurut (terbaru dulu) */
export function listHealthEntries(limit = 90) {
  return db
    .select()
    .from(healthEntries)
    .orderBy(desc(healthEntries.date))
    .limit(limit)
    .all();
}

/** Entri kesehatan terurut ascending (untuk chart) */
export function listHealthEntriesAsc(limit = 90) {
  return db
    .select()
    .from(healthEntries)
    .orderBy(asc(healthEntries.date))
    .limit(limit)
    .all();
}

/** Target kesehatan (single row) */
export function getHealthGoals() {
  return db.select().from(healthGoals).limit(1).get() ?? null;
}

/** Upsert target kesehatan */
export function upsertHealthGoals(goals: Partial<typeof healthGoals.$inferInsert>) {
  const existing = getHealthGoals();
  if (existing) {
    return db
      .update(healthGoals)
      .set(goals)
      .where(eq(healthGoals.id, existing.id))
      .returning()
      .get();
  }
  return db.insert(healthGoals).values(goals).returning().get();
}
