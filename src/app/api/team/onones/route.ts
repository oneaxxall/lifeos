import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamOneOnOnes } from "@/lib/db/schema";

/** GET /api/team/onones?memberId=N — riwayat 1-on-1 (opsional filter anggota) */
export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get("memberId");
  const rows = memberId
    ? db.select().from(teamOneOnOnes).where(eq(teamOneOnOnes.memberId, Number(memberId))).orderBy(desc(teamOneOnOnes.date)).all()
    : db.select().from(teamOneOnOnes).orderBy(desc(teamOneOnOnes.date)).all();
  return NextResponse.json({ data: rows });
}

/** POST /api/team/onones — catat 1-on-1 (TE-02) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const memberId = Number(body.memberId);
    if (!memberId) {
      return NextResponse.json({ error: "Pilih anggota tim" }, { status: 400 });
    }
    const date = String(body.date || new Date().toISOString().slice(0, 10));
    const row = db
      .insert(teamOneOnOnes)
      .values({
        memberId,
        date,
        topics: String(body.topics || ""),
        actionItems: String(body.actionItems || ""),
        notes: String(body.notes || ""),
      })
      .returning()
      .get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/team/onones error:", err);
    return NextResponse.json({ error: "Gagal menyimpan 1-on-1" }, { status: 500 });
  }
}
