import { NextResponse } from "next/server";
import { analyzeTime } from "@/lib/ai/time-insight";

/** POST /api/time/analyze — analisa pemborosan waktu, jam puncak, mingguan (TIM-05/06/07) */
export async function POST() {
  const result = await analyzeTime();
  return NextResponse.json(result);
}
