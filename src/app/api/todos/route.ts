import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { todos } from "@/lib/db/schema";
import { KANBAN_COLUMNS, listTodosByColumn, maxPositionInColumn } from "@/lib/db/todo-repo";

/** GET /api/todos — daftar tugas (grouped per kolom kanban) */
export async function GET() {
  const columns = listTodosByColumn();
  return NextResponse.json({ data: columns, columns: KANBAN_COLUMNS });
}

/** POST /api/todos — buat tugas baru (masuk kolom backlog) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Judul tugas wajib diisi" }, { status: 400 });
    }

    const status = KANBAN_COLUMNS.includes(body.status)
      ? body.status
      : "backlog";
    const position = maxPositionInColumn(status);

    const row = db
      .insert(todos)
      .values({
        title,
        description: String(body.description || ""),
        priority: ["tinggi", "sedang", "rendah"].includes(body.priority)
          ? body.priority
          : "sedang",
        dueDate: String(body.dueDate || ""),
        estimateMinutes: Number(body.estimateMinutes) || 0,
        status,
        position,
        area: String(body.area || ""),
      })
      .returning()
      .get();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/todos error:", err);
    return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
  }
}
