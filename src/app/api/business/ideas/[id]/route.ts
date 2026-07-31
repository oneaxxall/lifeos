import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businessIdeas } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/business/ideas/[id] — update status ide */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = String(body.status);
  if (body.title) updates.title = String(body.title);
  if (body.description !== undefined) updates.description = String(body.description);

  const row = db
    .update(businessIdeas)
    .set(updates)
    .where(eq(businessIdeas.id, Number(id)))
    .returning()
    .get();
  if (!row) {
    return NextResponse.json({ error: "Ide tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}

/** DELETE /api/business/ideas/[id] — hapus ide */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(businessIdeas).where(eq(businessIdeas.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Ide tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
