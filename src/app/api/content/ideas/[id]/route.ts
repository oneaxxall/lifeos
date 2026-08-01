import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentIdeas } from "@/lib/db/schema";

/** PATCH /api/content/ideas/[id] — update status pipeline (ide/riset/produksi/posting). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const status = ["ide", "riset", "produksi", "posting"].includes(body.status) ? body.status : "ide";
    await db.update(contentIdeas).set({ status }).where(eq(contentIdeas.id, Number(id))).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal update status" }, { status: 500 });
  }
}

/** DELETE /api/content/ideas/[id] — hapus ide. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await db.delete(contentIdeas).where(eq(contentIdeas.id, Number(id))).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
