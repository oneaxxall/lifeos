import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/team/members/[id] — hapus anggota */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(teamMembers).where(eq(teamMembers.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
