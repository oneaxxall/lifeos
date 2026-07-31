import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { habitLogs } from "@/lib/db/schema";

/** GET /api/habits/logs?habitId=1 — log check-in sebuah kebiasaan (menaik per tanggal). */
export async function GET(req: NextRequest) {
  const habitId = Number(req.nextUrl.searchParams.get("habitId"));
  if (!habitId) {
    return NextResponse.json({ error: "habitId diperlukan" }, { status: 400 });
  }
  const rows = db
    .select()
    .from(habitLogs)
    .where(eq(habitLogs.habitId, habitId))
    .orderBy(asc(habitLogs.date))
    .all();
  return NextResponse.json({
    data: rows.map((r) => ({
      date: r.date,
      status: r.status,
      jumlahKambuh: r.jumlahKambuh,
    })),
  });
}
