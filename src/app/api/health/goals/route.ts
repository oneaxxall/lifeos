import { NextRequest, NextResponse } from "next/server";
import { getHealthGoals, upsertHealthGoals } from "@/lib/db/health-repo";

/** GET /api/health/goals — target kesehatan */
export async function GET() {
  return NextResponse.json({ data: getHealthGoals() });
}

/** POST /api/health/goals — simpan/update target (HLT-03) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const goals = {
      goalWeightKg: body.goalWeightKg !== undefined ? Math.round(Number(body.goalWeightKg) * 10) / 10 : undefined,
      exercisePerWeekMinutes: body.exercisePerWeekMinutes !== undefined ? Math.round(Number(body.exercisePerWeekMinutes)) : undefined,
      sleepTargetHours: body.sleepTargetHours !== undefined ? Math.round(Number(body.sleepTargetHours) * 10) / 10 : undefined,
      dailyStepsTarget: body.dailyStepsTarget !== undefined ? Math.round(Number(body.dailyStepsTarget)) : undefined,
    };
    const clean = Object.fromEntries(
      Object.entries(goals).filter(([, v]) => v !== undefined)
    );
    const row = upsertHealthGoals(clean);
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/health/goals error:", err);
    return NextResponse.json({ error: "Gagal menyimpan target" }, { status: 500 });
  }
}
