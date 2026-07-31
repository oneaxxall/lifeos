import { NextResponse } from "next/server";
import { analyzeSpiritual } from "@/lib/ai/spiritual-insight";

/** POST /api/spiritual/analyze — konsistensi, kendor, target (SPI-02/03/04) */
export async function POST() {
  const result = await analyzeSpiritual();
  return NextResponse.json(result);
}
