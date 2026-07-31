import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businessProjects } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/business/projects/[id] — update tahap/target/deadline/aktif */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = String(body.name);
  if (body.stage) updates.stage = String(body.stage);
  if (body.target !== undefined) updates.target = String(body.target);
  if (body.deadline !== undefined) updates.deadline = String(body.deadline);
  if (body.active !== undefined) updates.active = Boolean(body.active);

  const row = db
    .update(businessProjects)
    .set(updates)
    .where(eq(businessProjects.id, Number(id)))
    .returning()
    .get();
  if (!row) {
    return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}

/** DELETE /api/business/projects/[id] — hapus proyek */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(businessProjects).where(eq(businessProjects.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
