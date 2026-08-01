import { NextRequest, NextResponse } from "next/server";
import { analyzeDelays } from "@/lib/ai/todo-delay";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/ai/todo-delay — deteksi & analisis pola penundaan (TDO-05) */
export async function POST(req: NextRequest) {
    const result = await cachedAnalyze(cacheKey("todo-delay"), async () => {
      const r = await analyzeDelays();
      return r;
    }, { fresh: req.nextUrl.searchParams.get("fresh") === "1" });
    return NextResponse.json(result);
}
