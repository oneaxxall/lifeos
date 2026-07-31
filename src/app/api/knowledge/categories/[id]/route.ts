import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, knowledgeCategories } from "@/lib/db/schema";

/** PATCH /api/knowledge/categories/[id] — rename kategori */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
  }
  const row = db
    .update(categories)
    .set({ name: name.toLowerCase() })
    .where(eq(categories.id, Number(id)))
    .returning()
    .get();
  if (!row) {
    return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}

/** DELETE /api/knowledge/categories/[id] — hapus kategori + relasinya */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.delete(knowledgeCategories).where(eq(knowledgeCategories.categoryId, Number(id))).run();
  const row = db.delete(categories).where(eq(categories.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
