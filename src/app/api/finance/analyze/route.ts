import { NextResponse } from "next/server";
import { analyzeFinance } from "@/lib/ai/finance-insight";

/** POST /api/finance/analyze — analisa pemborosan, subscription, kebiasaan (FIN-06/07/08) */
export async function POST() {
  const result = await analyzeFinance();
  return NextResponse.json(result);
}
