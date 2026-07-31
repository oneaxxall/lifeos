import { NextResponse } from "next/server";
import { analyzeMental } from "@/lib/ai/mental-insight";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/mental/analyze — pola mood, korelasi, saran (MEN-03/04/05) */
export async function POST() {
    const result = await cachedAnalyze(cacheKey("mental"), async () => {
    const r = await analyzeMental();
    return r;
  });
  return NextResponse.json(result);
}
