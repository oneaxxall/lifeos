import { NextRequest, NextResponse } from "next/server";
import { analyzeSpiritual } from "@/lib/ai/spiritual-insight";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/spiritual/analyze — konsistensi, kendor, target (SPI-02/03/04) */
export async function POST(req: NextRequest) {
    const result = await cachedAnalyze(cacheKey("spiritual"), async () => {
    const r = await analyzeSpiritual();
    return r;
  }, { fresh: req.nextUrl.searchParams.get("fresh") === "1" });
  return NextResponse.json(result);
}
