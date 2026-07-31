import { NextResponse } from "next/server";
import { analyzeDelays } from "@/lib/ai/todo-delay";

/** POST /api/ai/todo-delay — deteksi & analisis pola penundaan (TDO-05) */
export async function POST() {
  const result = await analyzeDelays();
  return NextResponse.json(result);
}
