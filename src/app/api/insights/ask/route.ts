import { NextRequest, NextResponse } from "next/server";
import { askLife } from "@/lib/ai/insights";

/** POST /api/insights/ask — tanya jawab natural (IN-06) */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const question = String(body.question || "").trim();
  if (!question) {
    return NextResponse.json({ error: "Tulis pertanyaanmu" }, { status: 400 });
  }
  const result = await askLife(question);
  return NextResponse.json(result);
}
