import { NextRequest, NextResponse } from "next/server";
import { analyzeHabit } from "@/lib/ai/habit-insight";

/**
 * POST /api/habits/analyze?habitId=N — analisa pemicu + saran pengganti
 * untuk SATU kebiasaan (BH-04/05). AI fokus per kebiasaan, bukan semua.
 */
export async function POST(req: NextRequest) {
  const habitId = Number(req.nextUrl.searchParams.get("habitId"));
  if (!habitId) {
    return NextResponse.json(
      { error: "habitId diperlukan — analisa bersifat per kebiasaan" },
      { status: 400 }
    );
  }
  const result = await analyzeHabit(habitId);
  return NextResponse.json(result);
}
