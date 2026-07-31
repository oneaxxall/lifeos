import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { sickEntries } from "@/lib/db/schema";
import { analyzeSymptoms } from "@/lib/ai/sick-advice";

/** GET /api/sick — riwayat catatan tidak enak badan */
export async function GET() {
  const rows = db.select().from(sickEntries).orderBy(desc(sickEntries.date), desc(sickEntries.id)).all();
  return NextResponse.json({ data: rows });
}

/** POST /api/sick — catat gejala + analisa AI (hasil dikembalikan untuk modal) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symptoms = String(body.symptoms || "").trim();
    if (!symptoms) {
      return NextResponse.json({ error: "Tulis dulu apa yang kamu rasakan" }, { status: 400 });
    }

    const duration = String(body.duration || "");
    const notes = String(body.notes || "");

    // Analisa AI (cepat, sebelum simpan)
    const advice = await analyzeSymptoms({ symptoms, duration, notes });

    const row = db
      .insert(sickEntries)
      .values({
        symptoms,
        duration,
        notes,
        aiAdvice: JSON.stringify(advice.data),
        needsProfessional: advice.data.needsProfessional,
      })
      .returning()
      .get();

    return NextResponse.json(
      { data: row, advice, source: advice.source },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/sick error:", err);
    return NextResponse.json({ error: "Gagal menyimpan catatan" }, { status: 500 });
  }
}
