import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/finance/subscriptions/[id] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.delete(subscriptions).where(eq(subscriptions.id, Number(id))).returning().get();
  if (!row) {
    return NextResponse.json({ error: "Subscription tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
