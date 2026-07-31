import { NextRequest, NextResponse } from "next/server";
import { getSpiritualGoals, upsertSpiritualGoals } from "@/lib/db/spiritual-repo";

/** GET /api/spiritual/goals — target spiritual */
export async function GET() {
  return NextResponse.json({ data: getSpiritualGoals() });
}

/** POST /api/spiritual/goals — simpan/update target (khatam, baca/minggu) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const goals = {
      quranKhatamJuz: body.quranKhatamJuz !== undefined ? Math.round(Number(body.quranKhatamJuz)) : undefined,
      weeklyReadMinutes: body.weeklyReadMinutes !== undefined ? Math.round(Number(body.weeklyReadMinutes)) : undefined,
    };
    const clean = Object.fromEntries(
      Object.entries(goals).filter(([, v]) => v !== undefined)
    );
    const row = upsertSpiritualGoals(clean);
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/spiritual/goals error:", err);
    return NextResponse.json({ error: "Gagal menyimpan target" }, { status: 500 });
  }
}
