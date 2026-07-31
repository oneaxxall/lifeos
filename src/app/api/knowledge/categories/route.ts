import { NextRequest, NextResponse } from "next/server";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, knowledgeCategories } from "@/lib/db/schema";

/** GET /api/knowledge/categories — kategori + jumlah knowledge per kategori */
export async function GET() {
  const rows = db.select().from(categories).orderBy(asc(categories.name)).all();
  const usage = db
    .select({ categoryId: knowledgeCategories.categoryId, n: count() })
    .from(knowledgeCategories)
    .groupBy(knowledgeCategories.categoryId)
    .all();
  const usageMap = new Map(usage.map((u) => [u.categoryId, u.n]));
  return NextResponse.json({
    data: rows.map((c) => ({ ...c, count: usageMap.get(c.id) ?? 0 })),
  });
}

/** POST /api/knowledge/categories — buat kategori baru */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }
    const row = db.insert(categories).values({ name: name.toLowerCase() }).returning().get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Kategori sudah ada" }, { status: 409 });
  }
}

/** PATCH /api/knowledge/categories — rename kategori */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    const name = String(body.name || "").trim();
    if (!id || !name) {
      return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
    }
    const row = db
      .update(categories)
      .set({ name: name.toLowerCase() })
      .where(eq(categories.id, id))
      .returning()
      .get();
    if (!row) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ data: row });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui kategori" }, { status: 500 });
  }
}

/** DELETE /api/knowledge/categories — hapus kategori + relasinya */
export async function DELETE(req: NextRequest) {
  try {
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
    }
    db.delete(knowledgeCategories).where(eq(knowledgeCategories.categoryId, id)).run();
    const row = db.delete(categories).where(eq(categories.id, id)).returning().get();
    if (!row) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ data: row });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus kategori" }, { status: 500 });
  }
}
