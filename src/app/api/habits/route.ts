import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { badHabits, habitLogs } from "@/lib/db/schema";

/** GET /api/habits — daftar kebiasaan + log hari ini (untuk check-in state). */
export async function GET() {
  const habits = db.select().from(badHabits).orderBy(desc(badHabits.id)).all();
  const today = new Date().toISOString().slice(0, 10);
  const data = habits.map((h) => {
    const todayLog = db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, h.id), eq(habitLogs.date, today)))
      .get();
    return { ...h, todayLog: todayLog ?? null };
  });
  return NextResponse.json({ data });
}

/** POST /api/habits — daftarkan kebiasaan buruk baru (BH-01). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama kebiasaan wajib diisi" }, { status: 400 });
    }
    const row = db
      .insert(badHabits)
      .values({
        name,
        category: String(body.category || "digital"),
        targetText: String(body.targetText || ""),
        alasan: String(body.alasan || ""),
        weeklyTarget: Number(body.weeklyTarget || 0),
      })
      .returning()
      .get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan kebiasaan" }, { status: 500 });
  }
}
