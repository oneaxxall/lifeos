import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeStories } from "@/lib/db/schema";

/** DELETE /api/stories/[id] — hapus cerita. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = Number(id);
    if (!Number.isFinite(num)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }
    const row = db.delete(lifeStories).where(eq(lifeStories.id, num)).returning().get();
    if (!row) {
      return NextResponse.json({ error: "Cerita tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/stories error:", err);
    return NextResponse.json({ error: "Gagal menghapus cerita" }, { status: 500 });
  }
}
