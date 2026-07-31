import { NextResponse } from "next/server";
import { analyzeBusinessPriority } from "@/lib/ai/business-insight";

/** POST /api/business/analyze — prioritas proyek mingguan (BIZ-04) */
export async function POST() {
  const result = await analyzeBusinessPriority();
  return NextResponse.json(result);
}
