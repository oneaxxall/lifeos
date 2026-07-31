import { NextResponse } from "next/server";
import { dailyBrief } from "@/lib/ai/insights";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/insights/daily — brief harian + perintah tindakan (IN-01/02) */
export async function POST() {
    const result = await cachedAnalyze(cacheKey("insights-daily"), async () => {
    const r = await dailyBrief();
    return r;
  });
  return NextResponse.json(result);
}
