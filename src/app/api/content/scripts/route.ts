import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentScripts } from "@/lib/db/schema";
import { generateContentScript } from "@/lib/ai/content-ai";

/** GET /api/content/scripts — riwayat naskah. */
export async function GET() {
  const rows = db.select().from(contentScripts).orderBy(desc(contentScripts.id)).all();
  return NextResponse.json({ data: rows });
}

/** POST /api/content/scripts — generate naskah via AI, simpan (opsional tautan ide). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic = String(body.topic || "").trim();
    const duration = Math.min(60, Math.max(15, Number(body.duration) || 45));
    const ideaId = body.ideaId ? Number(body.ideaId) : null;
    if (!topic) return NextResponse.json({ error: "Tulis dulu topik naskahnya" }, { status: 400 });
    const result = await generateContentScript(topic, duration);
    if (!result.ok || !result.data) {
      return NextResponse.json({ error: result.error || "Gagal generate naskah" }, { status: 500 });
    }
    const row = db
      .insert(contentScripts)
      .values({ topic, ideaId, duration, script: JSON.stringify(result.data) })
      .returning()
      .get();
    return NextResponse.json({ ok: true, data: row, source: result.source }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal generate naskah" }, { status: 500 });
  }
}
