import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentIdeas } from "@/lib/db/schema";
import { generateContentIdeas } from "@/lib/ai/content-ai";

/** GET /api/content/ideas — riwayat ide konten. */
export async function GET() {
  const rows = db.select().from(contentIdeas).orderBy(desc(contentIdeas.id)).all();
  return NextResponse.json({ data: rows });
}

/** POST /api/content/ideas — generate 5 ide hook via AI, simpan. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic = String(body.topic || "").trim();
    const format = String(body.format || "review").trim();
    if (!topic) return NextResponse.json({ error: "Tulis dulu topik/produk-nya" }, { status: 400 });
    const result = await generateContentIdeas(topic, format);
    if (!result.ok || !result.data) {
      return NextResponse.json({ error: result.error || "Gagal generate ide" }, { status: 500 });
    }
    const row = db
      .insert(contentIdeas)
      .values({ topic, format, ideas: JSON.stringify(result.data) })
      .returning()
      .get();
    return NextResponse.json({ ok: true, data: row, source: result.source }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal generate ide" }, { status: 500 });
  }
}
