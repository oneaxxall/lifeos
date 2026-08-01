import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { foodRecipes } from "@/lib/db/schema";

/** DELETE /api/food/[id] — hapus resep dari riwayat. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await db.delete(foodRecipes).where(eq(foodRecipes.id, Number(id))).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus resep" }, { status: 500 });
  }
}
