import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { carousels } from "@/lib/db/schema";
import { generateCarousel } from "@/lib/ai/carousel-ai";

/** GET /api/carousels — riwayat carousel (terbaru dulu). */
export async function GET() {
  const rows = db.select().from(carousels).orderBy(desc(carousels.id)).all();
  return NextResponse.json({ data: rows });
}

/** POST /api/carousels — generate konten + bgSpec via AI, simpan ke DB. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic = String(body.topic || "").trim();
    const slideCount = Math.min(10, Math.max(3, Number(body.slideCount) || 5));
    const theme = String(body.theme || "teal");
    const bgSource = (["gambar", "ai", "gradient"].includes(body.bgSource) ? body.bgSource : "ai") as
      | "gambar"
      | "ai"
      | "gradient";
    const contentStyle = body.contentStyle === "informatif" ? "informatif" : "ringkas";
    if (!topic) {
      return NextResponse.json({ error: "Tulis dulu topik carousel-nya" }, { status: 400 });
    }
    const result = await generateCarousel(topic, slideCount, theme, bgSource, contentStyle);
    if (!result.ok || !result.data) {
      return NextResponse.json(
        { error: result.error || "Gagal generate — coba lagi", source: result.source },
        { status: 500 }
      );
    }
    const row = db
      .insert(carousels)
      .values({
        topic,
        slideCount,
        theme,
        bgSource,
        contentStyle,
        content: JSON.stringify(result.data),
      })
      .returning()
      .get();
    return NextResponse.json({ ok: true, data: row, source: result.source }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal generate carousel" }, { status: 500 });
  }
}
