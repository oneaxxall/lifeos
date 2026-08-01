import { NextRequest, NextResponse } from "next/server";
import { analyzeTeam } from "@/lib/ai/team-insight";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/team/analyze — ringkasan tim, deteksi dini, persiapan 1-on-1 (TE-03/04) */
export async function POST(req: NextRequest) {
    const result = await cachedAnalyze(cacheKey("team"), async () => {
    const r = await analyzeTeam();
    return r;
  }, { fresh: req.nextUrl.searchParams.get("fresh") === "1" });
  return NextResponse.json(result);
}
