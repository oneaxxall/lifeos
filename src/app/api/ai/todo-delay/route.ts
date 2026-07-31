import { NextResponse } from "next/server";
import { analyzeDelays } from "@/lib/ai/todo-delay";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/ai/todo-delay — deteksi & analisis pola penundaan (TDO-05) */
export async function POST() {
    const result = await cachedAnalyze(cacheKey("todo-delay"), async () => {
      const r = await analyzeDelays();
      return r;
    });
    return NextResponse.json(result);
}
