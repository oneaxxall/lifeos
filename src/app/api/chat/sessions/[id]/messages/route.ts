import { NextRequest, NextResponse } from "next/server";
import { getSessionMessages } from "@/lib/ai/lifeos-chat";

/** GET /api/chat/sessions/[id]/messages?before=123&limit=50 — lazy load pesan. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const before = Number(req.nextUrl.searchParams.get("before") || 0) || undefined;
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 50)));
  const data = getSessionMessages(num, before, limit);
  const hasMore = data.length === limit;
  return NextResponse.json({ data, hasMore });
}
