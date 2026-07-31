import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/time/activities/[id] — hapus aktivitas */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(activities).where(eq(activities.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Aktivitas tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
