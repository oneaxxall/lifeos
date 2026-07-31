import { NextRequest, NextResponse } from "next/server";
import { timeSummary } from "@/lib/db/time-repo";

/** GET /api/time/summary?from=YYYY-MM-DD&to=YYYY-MM-DD — ringkasan waktu */
export async function GET(req: NextRequest) {
  const today = new Date().toISOString().slice(0, 10);
  const from = req.nextUrl.searchParams.get("from") || today;
  const to = req.nextUrl.searchParams.get("to") || today;
  return NextResponse.json({ data: timeSummary(from, to) });
}
