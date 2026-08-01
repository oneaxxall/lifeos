import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { todos } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** GET /api/todos/[id] — detail tugas */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.select().from(todos).where(eq(todos.id, Number(id))).get();
  if (!row) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}

/** PATCH /api/todos/[id] — update tugas (edit) */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await req.json();
    const row = db
      .update(todos)
      .set({
        ...(body.title !== undefined ? { title: String(body.title) } : {}),
        ...(body.description !== undefined ? { description: String(body.description) } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.dueDate !== undefined ? { dueDate: String(body.dueDate) } : {}),
        ...(body.estimateMinutes !== undefined
          ? { estimateMinutes: Number(body.estimateMinutes) || 0 }
          : {}),
        ...(body.area !== undefined ? { area: String(body.area) } : {}),
      })
      .where(eq(todos.id, Number(id)))
      .returning()
      .get();

    if (!row) {
      return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ data: row });
  } catch (err) {
    console.error("PATCH /api/todos error:", err);
    return NextResponse.json({ error: "Gagal memperbarui" }, { status: 500 });
  }
}

/** DELETE /api/todos/[id] — hapus tugas */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(todos).where(eq(todos.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
