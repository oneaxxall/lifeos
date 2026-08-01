import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { financialPlans } from "@/lib/db/schema";
import { computePlan, type PlanInput } from "@/lib/financial-plan";

const NUM = (v: unknown, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : def;
};

const LEVELS = ["sd", "smp", "sma", "kuliah"] as const;

/** Konversi row DB → PlanInput (schoolLevel DB string → union). */
function toInput(row: Record<string, unknown>): PlanInput {
  return {
    monthlyIncome: Number(row.monthlyIncome ?? 0),
    monthlyExpense: Number(row.monthlyExpense ?? 0),
    monthlySavings: Number(row.monthlySavings ?? 0),
    emergencyMonths: Number(row.emergencyMonths ?? 6),
    emergencyCurrent: Number(row.emergencyCurrent ?? 0),
    stockPct: Number(row.stockPct ?? 60),
    bondPct: Number(row.bondPct ?? 30),
    cashPct: Number(row.cashPct ?? 10),
    stockReturn: Number(row.stockReturn ?? 12),
    bondReturn: Number(row.bondReturn ?? 6),
    cashReturn: Number(row.cashReturn ?? 4),
    inflation: Number(row.inflation ?? 4),
    fireMultiple: Number(row.fireMultiple ?? 25),
    childrenCount: Number(row.childrenCount ?? 0),
    childAge: Number(row.childAge ?? 0),
    schoolLevel: (LEVELS as readonly string[]).includes(String(row.schoolLevel))
      ? (String(row.schoolLevel) as PlanInput["schoolLevel"])
      : "kuliah",
    schoolCostYear: Number(row.schoolCostYear ?? 0),
    schoolInflation: Number(row.schoolInflation ?? 10),
  };
}

/** GET /api/financial-plan — profil tersimpan + hasil kalkulasi terbaru. */
export async function GET() {
  const row = db.select().from(financialPlans).orderBy(desc(financialPlans.updatedAt)).limit(1).get();
  if (!row) {
    return NextResponse.json({ data: null });
  }
  const result = computePlan(toInput(row as unknown as Record<string, unknown>));
  return NextResponse.json({ data: row, result });
}

/** POST /api/financial-plan — simpan/update profil asumsi (satu profil aktif). */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();

    const stockPct = NUM(b.stockPct, 60);
    const bondPct = NUM(b.bondPct, 30);
    const cashPct = NUM(b.cashPct, 10);
    const totalPct = stockPct + bondPct + cashPct;
    const normalize = (v: number) => Math.round((v / Math.max(1, totalPct)) * 100);

    const schoolLevel = ["sd", "smp", "sma", "kuliah"].includes(String(b.schoolLevel))
      ? String(b.schoolLevel)
      : "kuliah";

    const values = {
      monthlyIncome: NUM(b.monthlyIncome, 0),
      monthlyExpense: NUM(b.monthlyExpense, 0),
      monthlySavings: NUM(b.monthlySavings, 0),
      emergencyMonths: Math.min(24, Math.max(1, NUM(b.emergencyMonths, 6))),
      emergencyCurrent: NUM(b.emergencyCurrent, 0),
      stockPct: normalize(stockPct),
      bondPct: normalize(bondPct),
      cashPct: normalize(cashPct),
      stockReturn: Math.min(30, Math.max(1, NUM(b.stockReturn, 12))),
      bondReturn: Math.min(20, Math.max(1, NUM(b.bondReturn, 6))),
      cashReturn: Math.min(15, Math.max(1, NUM(b.cashReturn, 4))),
      inflation: Math.min(15, Math.max(0, NUM(b.inflation, 4))),
      fireMultiple: Math.min(50, Math.max(10, NUM(b.fireMultiple, 25))),
      childrenCount: Math.min(10, Math.max(0, NUM(b.childrenCount, 0))),
      childAge: Math.min(30, Math.max(0, NUM(b.childAge, 0))),
      schoolLevel,
      schoolCostYear: NUM(b.schoolCostYear, 0),
      schoolInflation: Math.min(25, Math.max(0, NUM(b.schoolInflation, 10))),
      updatedAt: sql`(datetime('now'))`,
    };

    // Upsert: pakai row pertama yang ada (satu profil aktif)
    const existing = db.select().from(financialPlans).limit(1).get();
    let row;
    if (existing) {
      row = db.update(financialPlans).set(values).where(eq(financialPlans.id, existing.id)).returning().get();
    } else {
      row = db.insert(financialPlans).values(values).returning().get();
    }

    const result = computePlan(toInput(row as unknown as Record<string, unknown>));
    return NextResponse.json({ data: row, result }, { status: 201 });
  } catch (err) {
    console.error("POST /api/financial-plan error:", err);
    return NextResponse.json({ error: "Gagal menyimpan rencana" }, { status: 500 });
  }
}
