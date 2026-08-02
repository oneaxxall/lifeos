import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quoteTopics } from "@/lib/db/schema";

const PERSONALITIES = ["bijak", "tegas", "lembut", "motivator", "spiritual"];

/** PATCH /api/quote-topics/[id] — edit topik (nama/personality/deskripsi/aktif). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  try {
    const body = await req.json();
    const sets: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) sets.name = body.name.trim().toLowerCase();
    if (PERSONALITIES.includes(String(body.personality))) sets.personality = String(body.personality);
    if (typeof body.description === "string") sets.description = body.description.slice(0, 200);
    if (typeof body.active === "boolean") sets.active = body.active;
    if (Object.keys(sets).length === 0) return NextResponse.json({ error: "Tidak ada field valid" }, { status: 400 });
    await db.update(quoteTopics).set(sets).where(eq(quoteTopics.id, num)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui topik" }, { status: 500 });
  }
}

/** DELETE /api/quote-topics/[id] — hapus topik. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  try {
    await db.delete(quoteTopics).where(eq(quoteTopics.id, num)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus topik" }, { status: 500 });
  }
}
