import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { insights } from "@/lib/db/schema";

/** GET /api/insights — feed insight + status feedback (IN-03) */
export async function GET() {
  const rows = db.select().from(insights).orderBy(desc(insights.createdAt)).limit(50).all();
  return NextResponse.json({ data: rows });
}

/** PATCH /api/insights — update status (dilakukan/diabaikan) */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    const status = String(body.status || "baru");
    if (!id || !["baru", "dilakukan", "diabaikan"].includes(status)) {
      return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
    }
    const row = db
      .update(insights)
      .set({ status })
      .where(eq(insights.id, id))
      .returning()
      .get();
    return NextResponse.json({ data: row });
  } catch (err) {
    console.error("PATCH /api/insights error:", err);
    return NextResponse.json({ error: "Gagal update status" }, { status: 500 });
  }
}
