import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityCategories } from "@/lib/db/schema";

/** PATCH /api/time/categories/[id] — rename kategori aktivitas */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = String(body.name).toLowerCase();
  if (body.value && ["produktif", "netral", "buang"].includes(body.value)) updates.value = body.value;
  if (body.color) updates.color = String(body.color);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
  }
  const row = db
    .update(activityCategories)
    .set(updates)
    .where(eq(activityCategories.id, Number(id)))
    .returning()
    .get();
  if (!row) {
    return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}

/** DELETE /api/time/categories/[id] — hapus kategori aktivitas */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.delete(activityCategories).where(eq(activityCategories.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
