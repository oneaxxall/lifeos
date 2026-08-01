import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { foodRecipes } from "@/lib/db/schema";
import { generateRecipe } from "@/lib/ai/food-ai";

/** GET /api/food — riwayat resep (terbaru dulu). */
export async function GET() {
  const rows = db.select().from(foodRecipes).orderBy(desc(foodRecipes.id)).all();
  return NextResponse.json({ data: rows });
}

/** POST /api/food — generate resep + gizi via AI, simpan ke DB. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const request = String(body.request || "").trim();
    if (!request) {
      return NextResponse.json({ error: "Tulis dulu makanan/resep yang kamu inginkan" }, { status: 400 });
    }
    const result = await generateRecipe(request);
    if (!result.ok || !result.data) {
      return NextResponse.json(
        { error: result.error || "Gagal generate resep — coba lagi", source: result.source },
        { status: 500 }
      );
    }
    // Simpan ke DB (riwayat)
    const row = db
      .insert(foodRecipes)
      .values({ title: result.data.judul, request, recipe: JSON.stringify(result.data) })
      .returning()
      .get();
    return NextResponse.json({ ok: true, data: row, source: result.source }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal generate resep" }, { status: 500 });
  }
}
