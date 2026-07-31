import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { healthEntries } from "@/lib/db/schema";
import { listHealthEntries } from "@/lib/db/health-repo";

/** GET /api/health/entries — daftar entri kesehatan */
export async function GET() {
  return NextResponse.json({ data: listHealthEntries() });
}

/** POST /api/health/entries — catat entri harian (HLT-01) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const date = String(body.date || new Date().toISOString().slice(0, 10));

    // Upsert per tanggal (satu entri per hari)
    const existing = db
      .select()
      .from(healthEntries)
      .where(eq(healthEntries.date, date))
      .get();

    const values = {
      weightKg: body.weightKg !== undefined ? Math.round(Number(body.weightKg) * 10) / 10 : undefined,
      sleepHours: body.sleepHours !== undefined ? Math.round(Number(body.sleepHours) * 10) / 10 : undefined,
      exerciseMinutes: body.exerciseMinutes !== undefined ? Math.round(Number(body.exerciseMinutes)) : undefined,
      steps: body.steps !== undefined ? Math.round(Number(body.steps)) : undefined,
      waterGlasses: body.waterGlasses !== undefined ? Math.round(Number(body.waterGlasses)) : undefined,
      notes: body.notes !== undefined ? String(body.notes) : undefined,
    };

    // Hapus field undefined
    const cleanValues = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== undefined)
    ) as typeof values;

    const row = existing
      ? db
          .update(healthEntries)
          .set({ ...existing, ...cleanValues })
          .where(eq(healthEntries.id, existing.id))
          .returning()
          .get()
      : db
          .insert(healthEntries)
          .values({ date, ...cleanValues })
          .returning()
          .get();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/health/entries error:", err);
    return NextResponse.json({ error: "Gagal menyimpan entri kesehatan" }, { status: 500 });
  }
}
