import { NextRequest, NextResponse } from "next/server";
import { suggestTodoPriority } from "@/lib/ai/todo-priority";
import { cachedAnalyze, cacheKey } from "@/lib/ai/insight-cache";

/** POST /api/ai/todo-priority — saran 3 tugas terpenting hari ini (LLM server-side) */
export async function POST(req: NextRequest) {
    const result = await cachedAnalyze(cacheKey("todo-priority"), async () => {
      const r = await suggestTodoPriority();
      return r;
    }, { fresh: req.nextUrl.searchParams.get("fresh") === "1" });
    return NextResponse.json(result);
}
