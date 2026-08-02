import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages, chatSessions } from "@/lib/db/schema";
import { autoTitle, getSessionMessages, streamChat } from "@/lib/ai/lifeos-chat";

/**
 * POST /api/chat/stream — streaming jawaban AI.
 * Body: { sessionId, message }
 * Alur: simpan pesan user → stream jawaban → simpan pesan assistant → auto-title jika baru.
 * Response: text/plain streaming (chunk per chunk).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = Number(body.sessionId);
    const message = String(body.message || "").trim();
    if (!Number.isFinite(sessionId) || !message) {
      return NextResponse.json({ error: "Parameter tidak lengkap" }, { status: 400 });
    }

    const session = db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).get();
    if (!session) return NextResponse.json({ error: "Percakapan tidak ditemukan" }, { status: 404 });

    // Simpan pesan user + update waktu
    db.insert(chatMessages).values({ sessionId, role: "user", message }).run();
    db.update(chatSessions).set({ updatedAt: sql`(datetime('now'))` }).where(eq(chatSessions.id, sessionId)).run();

    // Auto-title dari pesan pertama (hanya jika masih "Percakapan baru")
    if (session.title === "Percakapan baru") {
      db.update(chatSessions).set({ title: autoTitle(message) }).where(eq(chatSessions.id, sessionId)).run();
    }

    // Riwayat untuk konteks (termasuk pesan user yang baru)
    const history = getSessionMessages(sessionId, undefined, 20).map((m) => ({ role: m.role as "user" | "assistant", message: m.message }));

    const stream = await streamChat({
      feature: session.context,
      history,
      mode: (session.mode as "curhat" | "advisor") ?? "advisor",
      advisor: session.advisor ?? "psikolog",
    });

    // Simpan jawaban setelah stream selesai → gunakan ReadableStream wrapper
    const encoder = new TextEncoder();
    let full = "";
    const wrapped = new ReadableStream({
      async start(controller) {
        try {
          const reader = stream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = typeof value === "string" ? value : new TextDecoder().decode(value);
            full += text;
            controller.enqueue(encoder.encode(text));
          }
          db.insert(chatMessages).values({ sessionId, role: "assistant", message: full.trim() || "(tanpa jawaban)" }).run();
          db.update(chatSessions).set({ updatedAt: sql`(datetime('now'))` }).where(eq(chatSessions.id, sessionId)).run();
        } catch (e) {
          controller.error(e);
        } finally {
          controller.close();
        }
      },
      cancel() {
        // Client disconnect — simpan apa yang sudah dihasilkan
        if (full.trim()) {
          db.insert(chatMessages).values({ sessionId, role: "assistant", message: full.trim() }).run();
        }
      },
    });

    return new Response(wrapped, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal streaming" }, { status: 500 });
  }
}
