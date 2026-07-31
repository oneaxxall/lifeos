import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamOneOnOnes } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/team/onones/[id] — hapus catatan 1-on-1 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(teamOneOnOnes).where(eq(teamOneOnOnes.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Catatan 1-on-1 tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
