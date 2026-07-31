import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgets } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/finance/budgets/[id] — hapus budget */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(budgets).where(eq(budgets.id, Number(id))).returning().get();
  if (!row) return NextResponse.json({ error: "Budget tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: row });
}
