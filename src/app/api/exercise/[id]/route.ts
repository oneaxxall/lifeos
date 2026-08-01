import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exercisePrograms } from "@/lib/db/schema";

/** DELETE /api/exercise/[id] — hapus program dari riwayat. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await db.delete(exercisePrograms).where(eq(exercisePrograms.id, Number(id))).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus program" }, { status: 500 });
  }
}
