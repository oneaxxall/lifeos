import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { exercisePrograms } from "@/lib/db/schema";
import { generateExerciseProgram } from "@/lib/ai/exercise-ai";

/** GET /api/exercise — riwayat program latihan (terbaru dulu). */
export async function GET() {
  const rows = db.select().from(exercisePrograms).orderBy(desc(exercisePrograms.id)).all();
  return NextResponse.json({ data: rows });
}

/** POST /api/exercise — generate program latihan via AI, simpan ke DB. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const goal = String(body.goal || "").trim();
    if (!goal) {
      return NextResponse.json({ error: "Tulis dulu tujuan latihanmu" }, { status: 400 });
    }
    const result = await generateExerciseProgram(goal);
    if (!result.ok || !result.data) {
      return NextResponse.json(
        { error: result.error || "Gagal generate program — coba lagi", source: result.source },
        { status: 500 }
      );
    }
    const row = db
      .insert(exercisePrograms)
      .values({ goal, program: JSON.stringify(result.data) })
      .returning()
      .get();
    return NextResponse.json({ ok: true, data: row, source: result.source }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal generate program" }, { status: 500 });
  }
}
