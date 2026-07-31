import { NextRequest, NextResponse } from "next/server";
import { monthlySummary } from "@/lib/db/finance-repo";

/** GET /api/finance/summary?month=YYYY-MM — ringkasan bulanan + per kategori */
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  return NextResponse.json({ data: monthlySummary(month) });
}
