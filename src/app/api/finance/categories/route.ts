import { NextRequest, NextResponse } from "next/server";
import { asc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { financeCategories, financeTransactions } from "@/lib/db/schema";

/** GET /api/finance/categories — daftar kategori + jumlah transaksi per kategori */
export async function GET() {
  const rows = db
    .select()
    .from(financeCategories)
    .orderBy(asc(financeCategories.name))
    .all();
  const usage = db
    .select({ categoryId: financeTransactions.categoryId, n: count() })
    .from(financeTransactions)
    .groupBy(financeTransactions.categoryId)
    .all();
  const usageMap = new Map(usage.map((u) => [u.categoryId, u.n]));
  return NextResponse.json({
    data: rows.map((c) => ({ ...c, count: usageMap.get(c.id) ?? 0 })),
  });
}

/** POST /api/finance/categories — buat kategori baru */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }
    const type = body.type === "masuk" ? "masuk" : "keluar";
    const row = db
      .insert(financeCategories)
      .values({
        name: name.toLowerCase(),
        type,
        icon: String(body.icon || ""),
      })
      .returning()
      .get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Kategori sudah ada" }, { status: 409 });
  }
}
