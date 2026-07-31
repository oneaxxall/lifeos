import { NextResponse } from "next/server";
import { weeklyReport } from "@/lib/ai/insights";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/insights/weekly — laporan mingguan + korelasi (IN-04/05) */
export async function POST() {
    const result = await cachedAnalyze(cacheKey("insights-weekly"), async () => {
    const r = await weeklyReport();
    return r;
  });
  return NextResponse.json(result);
}
