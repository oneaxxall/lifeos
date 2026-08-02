import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { financialPlans, financialChildren, debts } from "@/lib/db/schema";
import { analyzeFinancial, type FinancialAiInput } from "@/lib/ai/financial-ai";

const NUM = (v: unknown, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : def;
};

/** POST /api/financial-plan/analyze — AI analisa keuangan menyeluruh, simpan hasilnya. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Data diambil dari DB (bukan body) — analisa profil yang tersimpan
    const row = db.select().from(financialPlans).orderBy(sql`updated_at desc`).limit(1).get();
    if (!row) {
      return NextResponse.json({ error: "Simpan dulu profil keuanganmu sebelum analisa" }, { status: 400 });
    }

    const children = db.select().from(financialChildren).all();
    const debtsList = db
      .select()
      .from(debts)
      .where(sql`${debts.type} = 'hutang' AND ${debts.paymentMode} = 'cicilan'`)
      .all();

    const input: FinancialAiInput = {
      age: body.age !== undefined ? NUM(body.age, 0) : NUM(row.age, 0),
      monthlyIncome: NUM(row.monthlyIncome, 0),
      monthlyExpense: NUM(row.monthlyExpense, 0),
      monthlySavings: NUM(row.monthlySavings, 0),
      emergencyMonths: NUM(row.emergencyMonths, 6),
      emergencyCurrent: NUM(row.emergencyCurrent, 0),
      stockPct: NUM(row.stockPct, 60),
      bondPct: NUM(row.bondPct, 30),
      cashPct: NUM(row.cashPct, 10),
      stockReturn: NUM(row.stockReturn, 12),
      bondReturn: NUM(row.bondReturn, 6),
      cashReturn: NUM(row.cashReturn, 4),
      inflation: NUM(row.inflation, 4),
      fireMultiple: NUM(row.fireMultiple, 25),
      dividendTarget: body.dividendTarget !== undefined ? NUM(body.dividendTarget, 0) : NUM(row.dividendTarget, 0),
      dividendYield: NUM(row.dividendYield, 5),
      schoolInflation: NUM(row.schoolInflation, 10),
      children: children.map((c) => ({
        name: c.name,
        age: c.age,
        schoolLevel: c.schoolLevel,
        schoolCostYear: c.schoolCostYear,
      })),
      debts: debtsList.map((d) => ({
        party: d.party,
        amount: d.amount,
        paidAmount: d.paidAmount,
        paymentMode: d.paymentMode,
        installmentCount: d.installmentCount,
        installmentsPaid: d.installmentsPaid,
        interestRate: d.interestRate ?? 0,
        monthlyInstallment: d.monthlyInstallment ?? 0,
        dueDate: d.dueDate ?? "",
      })),
    };

    const result = await analyzeFinancial(input);
    if (!result.ok || !result.data) {
      return NextResponse.json({ error: result.error || "Gagal analisa — coba lagi" }, { status: 500 });
    }

    // Simpan hasil analisa di profil (tampilkan ulang tanpa biaya AI)
    await db.update(financialPlans).set({ analysis: JSON.stringify(result.data) }).where(eq(financialPlans.id, row.id)).run();

    return NextResponse.json({ ok: true, data: result.data, source: result.source });
  } catch {
    return NextResponse.json({ error: "Gagal analisa keuangan" }, { status: 500 });
  }
}
