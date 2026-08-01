import { NextRequest, NextResponse } from "next/server";
import { analyzeHealth } from "@/lib/ai/health-insight";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/health/analyze — analisa tren, kebiasaan buruk, rekomendasi (HLT-04/05/06) */
export async function POST(req: NextRequest) {
    const result = await cachedAnalyze(cacheKey("health"), async () => {
    const r = await analyzeHealth();
    return r;
  }, { fresh: req.nextUrl.searchParams.get("fresh") === "1" });
  return NextResponse.json(result);
}
