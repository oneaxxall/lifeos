import { NextResponse } from "next/server";
import { analyzeTodoDelay } from "@/lib/ai/todo-delay";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/ai/todo-delay — deteksi & analisis pola penundaan (TDO-05) */
export async function POST() {
    const result = await cachedAnalyze(cacheKey("todo-delay"), async () => {
      const r = await await analyzeTodoDelay();
      return r;
    });
    return NextResponse.json(result);
}
