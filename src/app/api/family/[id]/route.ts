import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { familyEntries } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/family/[id] — hapus curhatan */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(familyEntries).where(eq(familyEntries.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Curhatan tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
