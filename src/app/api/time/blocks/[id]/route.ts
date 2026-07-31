import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { timeBlocks } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/time/blocks/[id] — hapus time block */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(timeBlocks).where(eq(timeBlocks.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Time block tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
