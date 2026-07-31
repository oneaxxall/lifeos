import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { moodEntries } from "@/lib/db/schema";
import { listMoods } from "@/lib/db/mental-repo";

/** GET /api/mental/moods — daftar entri mood */
export async function GET() {
  return NextResponse.json({ data: listMoods() });
}

/** POST /api/mental/moods — catat mood 1-ketukan (MEN-01). Upsert per tanggal. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mood = Number(body.mood);
    if (!mood || mood < 1 || mood > 5) {
      return NextResponse.json({ error: "Mood harus 1-5" }, { status: 400 });
    }
    const date = String(body.date || new Date().toISOString().slice(0, 10));

    const existing = db.select().from(moodEntries).where(eq(moodEntries.date, date)).get();
    const row = existing
      ? db
          .update(moodEntries)
          .set({ mood, note: body.note !== undefined ? String(body.note) : existing.note })
          .where(eq(moodEntries.id, existing.id))
          .returning()
          .get()
      : db.insert(moodEntries).values({ date, mood, note: String(body.note || "") }).returning().get();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/mental/moods error:", err);
    return NextResponse.json({ error: "Gagal menyimpan mood" }, { status: 500 });
  }
}
