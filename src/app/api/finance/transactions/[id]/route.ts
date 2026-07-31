import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { financeTransactions } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/finance/transactions/[id] — edit transaksi */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await req.json();
    const row = db
      .update(financeTransactions)
      .set({
        ...(body.amount !== undefined
          ? { amount: Math.max(1, Math.round(Number(body.amount))) }
          : {}),
        ...(body.type !== undefined
          ? { type: body.type === "masuk" ? "masuk" : "keluar" }
          : {}),
        ...(body.description !== undefined
          ? { description: String(body.description) }
          : {}),
        ...(body.categoryId !== undefined
          ? { categoryId: body.categoryId ? Number(body.categoryId) : null }
          : {}),
        ...(body.date !== undefined ? { date: String(body.date) } : {}),
      })
      .where(eq(financeTransactions.id, Number(id)))
      .returning()
      .get();

    if (!row) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ data: row });
  } catch (err) {
    console.error("PATCH /api/finance/transactions error:", err);
    return NextResponse.json({ error: "Gagal memperbarui transaksi" }, { status: 500 });
  }
}

/** DELETE /api/finance/transactions/[id] — hapus transaksi */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db
    .delete(financeTransactions)
    .where(eq(financeTransactions.id, Number(id)))
    .returning()
    .get();
  if (!row) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
