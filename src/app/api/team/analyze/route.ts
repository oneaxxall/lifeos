import { NextResponse } from "next/server";
import { analyzeTeam } from "@/lib/ai/team-insight";

/** POST /api/team/analyze — ringkasan tim, deteksi dini, persiapan 1-on-1 (TE-03/04) */
export async function POST() {
  const result = await analyzeTeam();
  return NextResponse.json(result);
}
