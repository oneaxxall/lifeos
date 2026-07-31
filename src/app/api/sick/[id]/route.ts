import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sickEntries } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/sick/[id] — hapus catatan */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(sickEntries).where(eq(sickEntries.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
