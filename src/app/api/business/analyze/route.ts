import { NextRequest, NextResponse } from "next/server";
import { analyzeBusinessPriority } from "@/lib/ai/business-insight";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/business/analyze — prioritas proyek mingguan (BIZ-04) */
export async function POST(req: NextRequest) {
    const result = await cachedAnalyze(cacheKey("business"), async () => {
    const r = await analyzeBusinessPriority();
    return r;
  }, { fresh: req.nextUrl.searchParams.get("fresh") === "1" });
  return NextResponse.json(result);
}
