import { NextResponse } from "next/server";
import { analyzeSpiritual } from "@/lib/ai/spiritual-insight";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/spiritual/analyze — konsistensi, kendor, target (SPI-02/03/04) */
export async function POST() {
    const result = await cachedAnalyze(cacheKey("spiritual"), async () => {
    const r = await analyzeSpiritual();
    return r;
  });
  return NextResponse.json(result);
}
