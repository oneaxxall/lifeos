import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatSessions } from "@/lib/db/schema";

/** PATCH /api/chat/sessions/[id] — ganti judul / mode / advisor. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  try {
    const body = await req.json();
    const sets: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) sets.title = body.title.trim().slice(0, 60);
    if (body.mode === "curhat" || body.mode === "advisor") sets.mode = body.mode;
    if (typeof body.advisor === "string" && body.advisor.trim()) sets.advisor = body.advisor.trim().slice(0, 30);
    if (Object.keys(sets).length === 0) {
      return NextResponse.json({ error: "Tidak ada field valid" }, { status: 400 });
    }
    await db.update(chatSessions).set(sets).where(eq(chatSessions.id, num)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui" }, { status: 500 });
  }
}

/** DELETE /api/chat/sessions/[id] — hapus percakapan (pesan ikut terhapus). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  try {
    await db.delete(chatSessions).where(eq(chatSessions.id, num)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
