import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { badHabits, habitLogs } from "@/lib/db/schema";

/** PATCH /api/habits/[id] — ubah kebiasaan (target, alasan, aktif). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const hid = Number(id);
  if (!hid) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  try {
    const body = await req.json();
    const existing = db.select().from(badHabits).where(eq(badHabits.id, hid)).get();
    if (!existing) {
      return NextResponse.json({ error: "Kebiasaan tidak ditemukan" }, { status: 404 });
    }
    const row = db
      .update(badHabits)
      .set({
        name: body.name !== undefined ? String(body.name).trim() : existing.name,
        category: body.category !== undefined ? String(body.category) : existing.category,
        targetText: body.targetText !== undefined ? String(body.targetText) : existing.targetText,
        alasan: body.alasan !== undefined ? String(body.alasan) : existing.alasan,
        weeklyTarget: body.weeklyTarget !== undefined ? Number(body.weeklyTarget) : existing.weeklyTarget,
        active: body.active !== undefined ? Boolean(body.active) : existing.active,
      })
      .where(eq(badHabits.id, hid))
      .returning()
      .get();
    return NextResponse.json({ data: row });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui" }, { status: 500 });
  }
}

/** DELETE /api/habits/[id] — hapus kebiasaan + lognya (cascade manual). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const hid = Number(id);
  if (!hid) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  try {
    db.delete(habitLogs).where(eq(habitLogs.habitId, hid)).run();
    db.delete(badHabits).where(eq(badHabits.id, hid)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
