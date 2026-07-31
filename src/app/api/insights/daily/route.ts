import { NextResponse } from "next/server";
import { dailyBrief } from "@/lib/ai/insights";

/** POST /api/insights/daily — brief harian + perintah tindakan (IN-01/02) */
export async function POST() {
  const result = await dailyBrief();
  return NextResponse.json(result);
}
