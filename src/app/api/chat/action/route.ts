import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages, chatSessions } from "@/lib/db/schema";
import { detectChatAction, executeChatAction, type ChatAction } from "@/lib/ai/chat-actions";

/**
 * POST /api/chat/action
 * Body: { message, feature, confirm?, sessionId? }
 * - Tanpa confirm: deteksi aksi → { action } (untuk kartu konfirmasi)
 * - confirm=true: deteksi + EKSEKUSI → { result } + simpan pesan sistem ke riwayat
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = String(body.message || "").trim();
    const feature = String(body.feature || "umum");
    const confirm = body.confirm === true;
    const sessionId = body.sessionId ? Number(body.sessionId) : null;

    if (!message) return NextResponse.json({ error: "Pesan kosong" }, { status: 400 });

    const action = await detectChatAction(message, feature);
    if (!action || action.action === "none") {
      return NextResponse.json({ ok: true, action: null });
    }

    if (!confirm) {
      return NextResponse.json({ ok: true, action });
    }

    // Eksekusi + simpan pesan hasil ke riwayat chat
    const result = await executeChatAction(action as ChatAction);
    if (sessionId && Number.isFinite(sessionId)) {
      const label = actionLabel(action as ChatAction);
      db.insert(chatMessages)
        .values({ sessionId, role: "assistant", message: `${result.ok ? "✅" : "⚠️"} ${label}: ${result.message}` })
        .run();
      db.update(chatSessions).set({ updatedAt: sql`(datetime('now'))` }).where(eq(chatSessions.id, sessionId)).run();
    }
    return NextResponse.json({ ok: true, action, result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal memproses aksi" }, { status: 500 });
  }
}

function actionLabel(a: ChatAction): string {
  switch (a.action) {
    case "create_todo":
      return "Buat Todo";
    case "create_transaction":
      return "Catat Transaksi";
    case "create_knowledge":
      return "Simpan Catatan";
    case "complete_todo":
      return "Selesaikan Todo";
    default:
      return "Aksi";
  }
}
