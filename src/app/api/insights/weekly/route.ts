import { NextRequest, NextResponse } from "next/server";
import { weeklyReport } from "@/lib/ai/insights";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/insights/weekly — laporan mingguan + korelasi (IN-04/05) */
export async function POST(req: NextRequest) {
    const result = await cachedAnalyze(cacheKey("insights-weekly"), async () => {
    const r = await weeklyReport();
    return r;
  }, { fresh: req.nextUrl.searchParams.get("fresh") === "1" });
  return NextResponse.json(result);
}
