import { NextResponse } from "next/server";
import { weeklyReport } from "@/lib/ai/insights";

/** POST /api/insights/weekly — laporan mingguan + korelasi (IN-04/05) */
export async function POST() {
  const result = await weeklyReport();
  return NextResponse.json(result);
}
