import { NextRequest, NextResponse } from "next/server";
import { analyzeFinance } from "@/lib/ai/finance-insight";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/finance/analyze — analisa pemborosan, subscription, kebiasaan (FIN-06/07/08) */
export async function POST(req: NextRequest) {
    const result = await cachedAnalyze(cacheKey("finance"), async () => {
    const r = await analyzeFinance();
    return r;
  }, { fresh: req.nextUrl.searchParams.get("fresh") === "1" });
  return NextResponse.json(result);
}
