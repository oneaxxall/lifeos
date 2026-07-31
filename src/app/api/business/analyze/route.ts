import { NextResponse } from "next/server";
import { analyzeBusinessPriority } from "@/lib/ai/business-insight";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/business/analyze — prioritas proyek mingguan (BIZ-04) */
export async function POST() {
    const result = await cachedAnalyze(cacheKey("business"), async () => {
    const r = await analyzeBusinessPriority();
    return r;
  });
  return NextResponse.json(result);
}
