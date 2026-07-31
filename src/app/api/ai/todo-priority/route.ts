import { NextResponse } from "next/server";
import { analyzeTodoPriority } from "@/lib/ai/todo-priority";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/ai/todo-priority — saran 3 tugas terpenting hari ini (LLM server-side) */
export async function POST() {
    const result = await cachedAnalyze(cacheKey("todo-priority"), async () => {
      const r = await await analyzeTodoPriority();
      return r;
    });
    return NextResponse.json(result);
}
