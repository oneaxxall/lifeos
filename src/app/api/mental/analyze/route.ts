import { NextRequest, NextResponse } from "next/server";
import { analyzeMental } from "@/lib/ai/mental-insight";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/mental/analyze — pola mood, korelasi, saran (MEN-03/04/05) */
export async function POST(req: NextRequest) {
    const result = await cachedAnalyze(cacheKey("mental"), async () => {
    const r = await analyzeMental();
    return r;
  }, { fresh: req.nextUrl.searchParams.get("fresh") === "1" });
  return NextResponse.json(result);
}
