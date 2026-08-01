import { NextRequest, NextResponse } from "next/server";
import { KANBAN_COLUMNS, moveTodo } from "@/lib/db/todo-repo";

/** POST /api/todos/move — pindahkan tugas antar kolom (drag & drop)
 *  File terpisah agar tidak konflik dengan /api/todos (create) & /api/todos/[id] */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    const status = body.status;
    const position = Number(body.position) || 0;

    if (!id || !KANBAN_COLUMNS.includes(status)) {
      return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
    }

    const updated = moveTodo(id, status, position);
    if (!updated) {
      return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("POST /api/todos/move error:", err);
    return NextResponse.json({ error: "Gagal memindahkan" }, { status: 500 });
  }
}
