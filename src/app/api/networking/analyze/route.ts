import { NextResponse } from "next/server";
import { analyzeNetworking } from "@/lib/ai/networking-insight";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/networking/analyze — follow-up >90 hari + saran mingguan (NW-02/03) */
export async function POST() {
    const result = await cachedAnalyze(cacheKey("networking"), async () => {
    const r = await analyzeNetworking();
    return r;
  });
  return NextResponse.json(result);
}
