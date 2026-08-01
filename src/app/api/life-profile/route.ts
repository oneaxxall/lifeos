import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeProfiles } from "@/lib/db/schema";

/** GET /api/life-profile — profil biodata (1 baris). */
export async function GET() {
  const row = db.select().from(lifeProfiles).orderBy(desc(lifeProfiles.updatedAt)).limit(1).get();
  return NextResponse.json({ data: row ?? null });
}

/** POST /api/life-profile — simpan/upsert profil biodata. */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const existing = db.select().from(lifeProfiles).orderBy(desc(lifeProfiles.updatedAt)).limit(1).get();

    const values = {
      birthDate: String(b.birthDate || ""),
      values: String(b.values || "").slice(0, 1000),
      childhoodWounds: String(b.childhoodWounds || "").slice(0, 2000),
      parenting: String(b.parenting || "").slice(0, 2000),
      family: String(b.family || "").slice(0, 1000),
      lifeNotes: String(b.lifeNotes || "").slice(0, 4000),
    };

    if (existing) {
      const row = db
        .update(lifeProfiles)
        .set({ ...values, updatedAt: sql`(datetime('now'))` })
        .where(eq(lifeProfiles.id, existing.id))
        .returning()
        .get();
      return NextResponse.json({ data: row });
    }

    const row = db.insert(lifeProfiles).values(values).returning().get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/life-profile error:", err);
    return NextResponse.json({ error: "Gagal menyimpan profil" }, { status: 500 });
  }
}
