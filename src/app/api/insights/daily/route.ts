import { NextResponse } from "next/server";
import { dailyBrief } from "@/lib/ai/insights";

/**
 * POST /api/insights/daily — brief harian + perintah tindakan (IN-01/02).
 * Tanpa cache server-side: dailyBrief() sendiri sudah menangani "1x per hari"
 * via tabel insights (stale-while-revalidate → respons instan + generate background).
 */
export async function POST() {
  const result = await dailyBrief();
  return NextResponse.json(result);
}
