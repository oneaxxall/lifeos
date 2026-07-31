import { NextResponse } from "next/server";
import { analyzeHealth } from "@/lib/ai/health-insight";

/** POST /api/health/analyze — analisa tren, kebiasaan buruk, rekomendasi (HLT-04/05/06) */
export async function POST() {
  const result = await analyzeHealth();
  return NextResponse.json(result);
}
