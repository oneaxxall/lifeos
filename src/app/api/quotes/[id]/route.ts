import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyQuotes } from "@/lib/db/schema";

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
