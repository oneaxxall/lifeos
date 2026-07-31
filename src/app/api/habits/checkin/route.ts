import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { habitLogs } from "@/lib/db/schema";

/**
 * POST /api/habits/checkin — check-in harian 5 detik (BH-02).
 * Body: { habitId, status: "bersih" | "kambuh", jumlahKambuh?, catatan? }
 * Upsert per habit + tanggal hari ini.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const habitId = Number(body.habitId);
    const status = String(body.status || "") as "bersih" | "kambuh";
    if (!habitId || !["bersih", "kambuh"].includes(status)) {
      return NextResponse.json({ error: "Data check-in tidak valid" }, { status: 400 });
    }
    const date = String(body.date || new Date().toISOString().slice(0, 10));
    const jumlahKambuh = Math.max(1, Number(body.jumlahKambuh || 1));
    const catatan = String(body.catatan || "");

    const existing = db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)))
      .get();

    let row;
    if (existing) {
      row = db
        .update(habitLogs)
        .set({ status, jumlahKambuh, catatan })
        .where(eq(habitLogs.id, existing.id))
        .returning()
        .get();
    } else {
      row = db
        .insert(habitLogs)
        .values({ habitId, date, status, jumlahKambuh, catatan })
        .returning()
        .get();
    }
    return NextResponse.json({ data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan check-in" }, { status: 500 });
  }
}
