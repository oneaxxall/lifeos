import { NextResponse } from "next/server";
import { suggestTodoPriority } from "@/lib/ai/todo-priority";

/** POST /api/ai/todo-priority — saran 3 tugas terpenting hari ini (LLM server-side) */
export async function POST() {
  const result = await suggestTodoPriority();
  return NextResponse.json(result);
}
