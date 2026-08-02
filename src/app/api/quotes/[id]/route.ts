import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyQuotes } from "@/lib/db/schema";

/** PATCH /api/quotes/[id] — edit isi/penulis/topik quote. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) {
    return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  }
  try {
    const body = await req.json();
    const sets: Record<string, unknown> = {};
    if (typeof body.content === "string" && body.content.trim()) sets.content = body.content.trim();
    if (typeof body.author === "string") sets.author = body.author.trim();
    if (typeof body.topic === "string") sets.topic = body.topic.trim();
    if (Object.keys(sets).length === 0) {
      return NextResponse.json({ error: "Tidak ada field valid" }, { status: 400 });
    }
    await db.update(dailyQuotes).set(sets).where(eq(dailyQuotes.id, num)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui quote" }, { status: 500 });
  }
}

/** DELETE /api/quotes/[id] — hapus satu quote dari riwayat. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) {
    return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  }
  try {
    await db.delete(dailyQuotes).where(eq(dailyQuotes.id, num)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus quote" }, { status: 500 });
  }
}
