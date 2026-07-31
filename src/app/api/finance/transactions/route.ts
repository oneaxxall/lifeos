import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financeTransactions } from "@/lib/db/schema";
import { listTransactions } from "@/lib/db/finance-repo";

/** GET /api/finance/transactions — daftar transaksi (dengan kategori) */
export async function GET() {
  return NextResponse.json({ data: listTransactions() });
}

/** POST /api/finance/transactions — catat transaksi (FIN-01) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amount = Math.round(Number(body.amount));
    const type = body.type === "masuk" ? "masuk" : "keluar";

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Nominal harus lebih dari 0" }, { status: 400 });
    }

    const row = db
      .insert(financeTransactions)
      .values({
        amount,
        type,
        description: String(body.description || ""),
        categoryId: body.categoryId ? Number(body.categoryId) : null,
        date: String(body.date || new Date().toISOString().slice(0, 10)),
      })
      .returning()
      .get();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/finance/transactions error:", err);
    return NextResponse.json({ error: "Gagal menyimpan transaksi" }, { status: 500 });
  }
}
