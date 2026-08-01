import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carousels } from "@/lib/db/schema";

/** PATCH /api/carousels/[id] — simpan hasil edit konten (teks slide). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    if (typeof body.content !== "string" || !body.content) {
      return NextResponse.json({ error: "Konten tidak valid" }, { status: 400 });
    }
    await db
      .update(carousels)
      .set({ content: body.content })
      .where(eq(carousels.id, Number(id)))
      .run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
  }
}

/** GET /api/carousels/[id] — detail satu carousel (editor). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const row = db.select().from(carousels).where(eq(carousels.id, Number(id))).get();
    if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ data: row });
  } catch {
    return NextResponse.json({ error: "Gagal memuat" }, { status: 500 });
  }
}

/** DELETE /api/carousels/[id] — hapus carousel. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await db.delete(carousels).where(eq(carousels.id, Number(id))).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
