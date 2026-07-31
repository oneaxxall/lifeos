import { NextRequest, NextResponse } from "next/server";
import { like } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgets, financeCategories, financeTransactions } from "@/lib/db/schema";

/** GET /api/finance/budgets?month=YYYY-MM — budget + pemakaian per kategori */
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);

  const budgetRows = db.select().from(budgets).all();
  const cats = db.select().from(financeCategories).all();
  const txRows = db
    .select()
    .from(financeTransactions)
    .where(like(financeTransactions.date, `${month}%`))
    .all();

  // Pengeluaran per kategori bulan ini
  const spentByCat = new Map<number, number>();
  for (const tx of txRows) {
    if (tx.type === "keluar" && tx.categoryId) {
      spentByCat.set(tx.categoryId, (spentByCat.get(tx.categoryId) ?? 0) + tx.amount);
    }
  }

  const data = budgetRows.map((b) => {
    const cat = cats.find((c) => c.id === b.categoryId);
    const spent = spentByCat.get(b.categoryId) ?? 0;
    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: cat?.name ?? "?",
      limitAmount: b.limitAmount,
      spent,
      remaining: b.limitAmount - spent,
      percent: b.limitAmount > 0 ? Math.round((spent / b.limitAmount) * 100) : 0,
    };
  });

  return NextResponse.json({ data });
}

/** POST /api/finance/budgets — set budget per kategori */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const categoryId = Number(body.categoryId);
    const limitAmount = Math.round(Number(body.limitAmount));
    if (!categoryId || !limitAmount || limitAmount <= 0) {
      return NextResponse.json({ error: "Kategori & batas wajib diisi" }, { status: 400 });
    }
    const row = db
      .insert(budgets)
      .values({
        categoryId,
        limitAmount,
        period: String(body.period || ""),
      })
      .returning()
      .get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/finance/budgets error:", err);
    return NextResponse.json({ error: "Gagal menyimpan budget" }, { status: 500 });
  }
}
