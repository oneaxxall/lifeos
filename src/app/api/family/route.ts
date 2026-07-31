import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { familyEntries } from "@/lib/db/schema";
import { analyzeFamilyVent } from "@/lib/ai/family-advice";

/** GET /api/family — riwayat curhatan keluarga */
export async function GET() {
  const rows = db
    .select()
    .from(familyEntries)
    .orderBy(desc(familyEntries.date), desc(familyEntries.id))
    .all();
  return NextResponse.json({ data: rows });
}

/** POST /api/family — curhat + nasihat AI (hasil dikembalikan untuk modal) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content = String(body.content || "").trim();
    if (!content) {
      return NextResponse.json({ error: "Tulis dulu curhatanmu" }, { status: 400 });
    }

    const people = String(body.people || "");
    const mood = String(body.mood || "");

    const advice = await analyzeFamilyVent({ content, people, mood });

    const row = db
      .insert(familyEntries)
      .values({
        content,
        people,
        mood,
        aiAdvice: JSON.stringify(advice.data),
      })
      .returning()
      .get();

    return NextResponse.json({ data: row, advice, source: advice.source }, { status: 201 });
  } catch (err) {
    console.error("POST /api/family error:", err);
    return NextResponse.json({ error: "Gagal menyimpan curhatan" }, { status: 500 });
  }
}
