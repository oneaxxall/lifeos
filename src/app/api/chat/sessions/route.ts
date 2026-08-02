import { NextRequest, NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/ai/lifeos-chat";

/** GET /api/chat/sessions — daftar percakapan (terbaru dulu). */
export async function GET() {
  return NextResponse.json({ data: listSessions() });
}

/** POST /api/chat/sessions — buat percakapan baru dengan konteks fitur. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const feature = String(body.feature || "umum");
    const row = createSession(feature);
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal membuat percakapan" }, { status: 500 });
  }
}
