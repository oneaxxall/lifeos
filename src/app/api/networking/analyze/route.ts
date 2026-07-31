import { NextResponse } from "next/server";
import { analyzeNetworking } from "@/lib/ai/networking-insight";

/** POST /api/networking/analyze — follow-up >90 hari + saran mingguan (NW-02/03) */
export async function POST() {
  const result = await analyzeNetworking();
  return NextResponse.json(result);
}
