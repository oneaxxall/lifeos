import { NextResponse } from "next/server";
import { analyzeMental } from "@/lib/ai/mental-insight";

/** POST /api/mental/analyze — pola mood, korelasi, saran (MEN-03/04/05) */
export async function POST() {
  const result = await analyzeMental();
  return NextResponse.json(result);
}
