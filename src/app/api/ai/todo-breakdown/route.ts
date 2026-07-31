import { NextRequest, NextResponse } from "next/server";
import { breakdownTodo } from "@/lib/ai/todo-breakdown";

/** POST /api/ai/todo-breakdown — pecah tugas besar jadi sub-langkah (TDO-06) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
    }
    const result = await breakdownTodo(id);
    if (!result.ok) {
      return NextResponse.json(result, { status: result.source === "not-found" ? 404 : 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/ai/todo-breakdown error:", err);
    return NextResponse.json({ error: "Gagal memecah tugas" }, { status: 500 });
  }
}
