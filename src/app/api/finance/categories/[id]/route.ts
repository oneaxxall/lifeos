import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { financeCategories } from "@/lib/db/schema";

/** PATCH /api/finance/categories/[id] — rename kategori */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
  }
  const row = db
    .update(financeCategories)
    .set({ name: name.toLowerCase() })
    .where(eq(financeCategories.id, Number(id)))
    .returning()
    .get();
  if (!row) {
    return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}

/** DELETE /api/finance/categories/[id] — hapus kategori */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.delete(financeCategories).where(eq(financeCategories.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
