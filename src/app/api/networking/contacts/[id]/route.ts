import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/networking/contacts/[id] — update kontak / tandai sudah dihubungi */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = String(body.name);
  if (body.role !== undefined) updates.role = String(body.role);
  if (body.company !== undefined) updates.company = String(body.company);
  if (body.context !== undefined) updates.context = String(body.context);
  if (body.interests !== undefined) updates.interests = String(body.interests);
  if (body.priority) updates.priority = String(body.priority);
  if (body.lastContact !== undefined) updates.lastContact = String(body.lastContact);

  const row = db
    .update(contacts)
    .set(updates)
    .where(eq(contacts.id, Number(id)))
    .returning()
    .get();
  if (!row) {
    return NextResponse.json({ error: "Kontak tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}

/** DELETE /api/networking/contacts/[id] — hapus kontak */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(contacts).where(eq(contacts.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Kontak tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
