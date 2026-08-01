import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliateProducts } from "@/lib/db/schema";

/** PATCH /api/content/products/[id] — update status pipeline & performa. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const sets: Record<string, unknown> = {};
    if (body.status && ["riset", "dipromosikan", "komisi"].includes(body.status)) sets.status = body.status;
    if (body.views !== undefined) sets.views = Math.max(0, Number(body.views) || 0);
    if (body.likes !== undefined) sets.likes = Math.max(0, Number(body.likes) || 0);
    if (body.clicks !== undefined) sets.clicks = Math.max(0, Number(body.clicks) || 0);
    if (body.commissionReceived !== undefined) sets.commissionReceived = Math.max(0, Number(body.commissionReceived) || 0);
    if (body.link !== undefined) sets.link = String(body.link || "");
    if (Object.keys(sets).length === 0) {
      return NextResponse.json({ error: "Tidak ada field valid" }, { status: 400 });
    }
    await db.update(affiliateProducts).set(sets).where(eq(affiliateProducts.id, Number(id))).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal update produk" }, { status: 500 });
  }
}

/** DELETE /api/content/products/[id] — hapus produk. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await db.delete(affiliateProducts).where(eq(affiliateProducts.id, Number(id))).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
