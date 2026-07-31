import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { moodEntries } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/mental/moods/[id] — hapus entri mood */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(moodEntries).where(eq(moodEntries.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Entri mood tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
