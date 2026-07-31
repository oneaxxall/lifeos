import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { spiritualEntries } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/spiritual/entries/[id] — hapus entri ritual */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(spiritualEntries).where(eq(spiritualEntries.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Entri tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
