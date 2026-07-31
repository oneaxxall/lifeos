import { asc, desc, eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activities,
  activityCategories,
  timeBlocks,
  type Activity,
} from "@/lib/db/schema";

export interface ActivityWithCategory extends Activity {
  categoryName: string | null;
  categoryValue: "produktif" | "netral" | "buang" | null;
  categoryColor: string | null;
}

export function listActivityCategories() {
  return db.select().from(activityCategories).orderBy(asc(activityCategories.name)).all();
}

/** Aktivitas + nama/nilai/warna kategori (join) */
export function listActivities(limit = 50): ActivityWithCategory[] {
  const rows = db
    .select({
      a: activities,
      categoryName: activityCategories.name,
      categoryValue: activityCategories.value,
      categoryColor: activityCategories.color,
    })
    .from(activities)
    .leftJoin(activityCategories, eq(activities.categoryId, activityCategories.id))
    .orderBy(desc(activities.startedAt))
    .limit(limit)
    .all();

  return rows.map(({ a, categoryName, categoryValue, categoryColor }) => ({
    ...a,
    categoryName: categoryName ?? null,
    categoryValue: categoryValue ?? null,
    categoryColor: categoryColor ?? null,
  }));
}

/** Aktivitas yang masih berjalan (endedAt kosong) */
export function getActiveActivity(): ActivityWithCategory | null {
  const row = db
    .select({
      a: activities,
      categoryName: activityCategories.name,
      categoryValue: activityCategories.value,
      categoryColor: activityCategories.color,
    })
    .from(activities)
    .leftJoin(activityCategories, eq(activities.categoryId, activityCategories.id))
    .where(eq(activities.endedAt, ""))
    .orderBy(desc(activities.startedAt))
    .limit(1)
    .get();

  if (!row) return null;
  return {
    ...row.a,
    categoryName: row.categoryName ?? null,
    categoryValue: row.categoryValue ?? null,
    categoryColor: row.categoryColor ?? null,
  };
}

/** Ringkasan per kategori untuk rentang tanggal (dari & sampai, inclusive) */
export function timeSummary(from: string, to: string) {
  const rows = db
    .select({
      a: activities,
      categoryName: activityCategories.name,
      categoryValue: activityCategories.value,
      categoryColor: activityCategories.color,
    })
    .from(activities)
    .leftJoin(activityCategories, eq(activities.categoryId, activityCategories.id))
    .where(like(activities.startedAt, `${from.slice(0, 7)}%`))
    .all();

  const inRange = rows.filter((r) => {
    const day = r.a.startedAt.slice(0, 10);
    return day >= from && day <= to;
  });

  const byCategory = new Map<string, { menit: number; value: string; color: string }>();
  let totalMenit = 0;
  let produktifMenit = 0;
  let buangMenit = 0;

  for (const r of inRange) {
    const menit = r.a.durationMinutes || 0;
    totalMenit += menit;
    const key = r.categoryName ?? "Tanpa kategori";
    const cur = byCategory.get(key) ?? {
      menit: 0,
      value: r.categoryValue ?? "netral",
      color: r.categoryColor ?? "#0D9488",
    };
    cur.menit += menit;
    byCategory.set(key, cur);

    if (r.categoryValue === "produktif") produktifMenit += menit;
    if (r.categoryValue === "buang") buangMenit += menit;
  }

  const kategori = Array.from(byCategory.entries())
    .map(([nama, v]) => ({ nama, ...v }))
    .sort((a, b) => b.menit - a.menit);

  return {
    from,
    to,
    totalMenit,
    produktifMenit,
    buangMenit,
    netralMenit: totalMenit - produktifMenit - buangMenit,
    kategori,
  };
}

/** Time block per hari */
export function listTimeBlocks(day: string) {
  return db
    .select({
      block: timeBlocks,
      categoryName: activityCategories.name,
      categoryColor: activityCategories.color,
    })
    .from(timeBlocks)
    .leftJoin(activityCategories, eq(timeBlocks.categoryId, activityCategories.id))
    .where(eq(timeBlocks.day, day))
    .orderBy(asc(timeBlocks.startTime))
    .all()
    .map(({ block, categoryName, categoryColor }) => ({
      ...block,
      categoryName: categoryName ?? null,
      categoryColor: categoryColor ?? null,
    }));
}
