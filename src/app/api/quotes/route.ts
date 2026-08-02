import { NextRequest, NextResponse } from "next/server";
import { generateQuotes, getAllQuotes, getQuotesByDate } from "@/lib/ai/quote-generator";

/**
 * GET /api/quotes?date=YYYY-MM-DD — quote hari itu (default hari ini).
 * GET /api/quotes (tanpa date) — SEMUA riwayat quote (terbaru dulu).
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (date) {
    const quotes = getQuotesByDate(date);
    return NextResponse.json({ data: quotes });
  }
  const all = getAllQuotes();
  return NextResponse.json({ data: all });
}

/** POST /api/quotes — generate & simpan quote hari ini (APPEND). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const count = Number(body.count || 1);
    const topic = String(body.topic || "motivasi").trim();
    const personality = String(body.personality || "bijak");
    const context = String(body.context || "").trim();
    const result = await generateQuotes({
      count,
      topic,
      personality: personality as Parameters<typeof generateQuotes>[0]["personality"],
      context: context || undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Gagal generate" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: result.data, source: result.source });
  } catch {
    return NextResponse.json({ error: "Gagal generate quotes" }, { status: 500 });
  }
}
