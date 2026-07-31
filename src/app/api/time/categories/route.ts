import { NextRequest, NextResponse } from "next/server";
import { asc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, activityCategories } from "@/lib/db/schema";

/** GET /api/time/categories — kategori aktivitas + jumlah aktivitas per kategori */
export async function GET() {
  const rows = db.select().from(activityCategories).orderBy(asc(activityCategories.name)).all();
  const usage = db
    .select({ categoryId: activities.categoryId, n: count() })
    .from(activities)
    .groupBy(activities.categoryId)
    .all();
  const usageMap = new Map(usage.map((u) => [u.categoryId, u.n]));
  return NextResponse.json({
    data: rows.map((c) => ({ ...c, count: usageMap.get(c.id) ?? 0 })),
  });
}

/** POST /api/time/categories — buat kategori aktivitas */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }
    const value = ["produktif", "netral", "buang"].includes(body.value)
      ? body.value
      : "netral";
    const row = db
      .insert(activityCategories)
      .values({
        name: name.toLowerCase(),
        value,
        color: String(body.color || "#0D9488"),
      })
      .returning()
      .get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Kategori sudah ada" }, { status: 409 });
  }
}
