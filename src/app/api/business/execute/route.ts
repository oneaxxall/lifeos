import { NextRequest, NextResponse } from "next/server";
import { generateExecutionPlan, pushPlanToTodos } from "@/lib/ai/business-insight";

/** POST /api/business/execute — rencana 30 hari dari ide + opsional kirim ke Todo (BIZ-03) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Judul ide kosong" }, { status: 400 });
    }
    const description = String(body.description || "");

    // 1. Generate rencana
    const plan = await generateExecutionPlan({ title, description });

    // 2. Kirim ke Todo jika diminta
    let pushed = 0;
    if (body.pushToTodo) {
      pushed = pushPlanToTodos(plan.data, title);
    }

    return NextResponse.json({
      ok: true,
      data: plan.data,
      source: plan.source,
      pushed,
    });
  } catch (err) {
    console.error("POST /api/business/execute error:", err);
    return NextResponse.json({ error: "Gagal membuat rencana" }, { status: 500 });
  }
}
