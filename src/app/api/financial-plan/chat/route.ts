import { NextRequest, NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { financialPlans, financialChildren, debts, financialChats } from "@/lib/db/schema";
import { monthlySummary } from "@/lib/db/finance-repo";
import { chatFinancial, type FinancialAiInput } from "@/lib/ai/financial-ai";

const NUM = (v: unknown, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : def;
};

/** GET /api/financial-plan/chat — riwayat percakapan dengan AI advisor. */
export async function GET() {
  const rows = db.select().from(financialChats).orderBy(desc(financialChats.id)).limit(60).all();
  return NextResponse.json({ data: rows.reverse() });
}

/** POST /api/financial-plan/chat — kirim pesan, AI jawab dengan konteks profil, simpan keduanya. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = String(body.message || "").trim();
    if (!question) {
      return NextResponse.json({ error: "Tulis dulu pertanyaannya" }, { status: 400 });
    }

    // Konteks dari DB
    const row = db.select().from(financialPlans).orderBy(sql`updated_at desc`).limit(1).get();
    const children = db.select().from(financialChildren).all();
    const debtsList = db
      .select()
      .from(debts)
      .where(sql`${debts.type} = 'hutang' AND ${debts.paymentMode} = 'cicilan'`)
      .all();
    const summary = monthlySummary(new Date().toISOString().slice(0, 7));

    const input: FinancialAiInput = {
      age: NUM(row?.age, 0),
      monthlyIncome: NUM(row?.monthlyIncome, 0),
      monthlyExpense: NUM(row?.monthlyExpense, 0),
      monthlySavings: NUM(row?.monthlySavings, 0),
      emergencyMonths: NUM(row?.emergencyMonths, 6),
      emergencyCurrent: NUM(row?.emergencyCurrent, 0),
      stockPct: NUM(row?.stockPct, 60),
      bondPct: NUM(row?.bondPct, 30),
      cashPct: NUM(row?.cashPct, 10),
      stockReturn: NUM(row?.stockReturn, 12),
      bondReturn: NUM(row?.bondReturn, 6),
      cashReturn: NUM(row?.cashReturn, 4),
      inflation: NUM(row?.inflation, 4),
      fireMultiple: NUM(row?.fireMultiple, 25),
      dividendTarget: NUM(row?.dividendTarget, 0),
      dividendYield: NUM(row?.dividendYield, 5),
      schoolInflation: NUM(row?.schoolInflation, 10),
      actualIncome: summary.masuk,
      actualExpense: summary.keluar,
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

    // Simpan pesan user dulu
    db.insert(financialChats).values({ role: "user", message: question }).run();

    const result = await chatFinancial(input, question);
    if (!result.ok || !result.text) {
      return NextResponse.json({ error: result.error || "Gagal menjawab — coba lagi" }, { status: 500 });
    }

    // Simpan jawaban AI
    const ai = db.insert(financialChats).values({ role: "assistant", message: result.text }).returning().get();

    return NextResponse.json({ ok: true, data: ai });
  } catch {
    return NextResponse.json({ error: "Gagal memproses chat" }, { status: 500 });
  }
}
