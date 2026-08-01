import { NextRequest, NextResponse } from "next/server";
import { analyzeTime } from "@/lib/ai/time-insight";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/time/analyze — analisa pemborosan waktu, jam puncak, mingguan (TIM-05/06/07) */
export async function POST(req: NextRequest) {
    const result = await cachedAnalyze(cacheKey("time"), async () => {
    const r = await analyzeTime();
    return r;
  }, { fresh: req.nextUrl.searchParams.get("fresh") === "1" });
  return NextResponse.json(result);
}
