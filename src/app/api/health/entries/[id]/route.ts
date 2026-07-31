import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { healthEntries } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/health/entries/[id] — hapus entri */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(healthEntries).where(eq(healthEntries.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Entri tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
