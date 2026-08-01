/** Kalkulasi Financial Planning — client-safe (deterministik, tanpa DB). */

export interface PlanInput {
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySavings: number;
  emergencyMonths: number;
  emergencyCurrent: number;
  stockPct: number;
  bondPct: number;
  cashPct: number;
  stockReturn: number;
  bondReturn: number;
  cashReturn: number;
  inflation: number;
  fireMultiple: number;
  childrenCount: number;
  childAge: number;
  schoolLevel: "sd" | "smp" | "sma" | "kuliah";
  schoolCostYear: number;
  schoolInflation: number;
}

export interface YearPoint {
  year: number;
  age: number;
  /** Nilai portofolio (Rp) */
  portfolio: number;
  /** Pengeluaran tahunan saat itu (Rp, setelah inflasi) */
  annualExpense: number;
  /** Target FIRE saat itu (Rp) */
  fireTarget: number;
  fireReached: boolean;
}

export interface PlanResult {
  /** ── Tabungan darurat ── */
  emergencyTarget: number;
  emergencyGap: number;
  emergencyProgressPct: number;
  emergencyMonthsToReach: number | null;
  emergencyReached: boolean;
  /** ── Dana sekolah ── */
  schoolYearsLeft: number;
  schoolFutureCost: number;
  schoolCostPerMonth: number;
  /** ── FIRE ── */
  weightedReturn: number; // % per tahun
  annualSavings: number;
  annualExpenseNow: number;
  fireTargetNow: number;
  yearsToFire: number | null;
  fireAge: number | null;
  fireReached: boolean;
  /** Porsi nabung vs pemasukan (%) */
  savingsRatePct: number;
  /** Proyeksi tahunan (untuk grafik) */
  projection: YearPoint[];
}

const LEVEL_AGE: Record<PlanInput["schoolLevel"], number> = {
  sd: 7,
  smp: 13,
  sma: 16,
  kuliah: 19,
};

/** Rupiah tanpa desimal */
export function fmtRp(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("id-ID");
}

/** Kalkulasi lengkap — semua turunan dari input. */
export function computePlan(p: PlanInput): PlanResult {
  const monthlyExpense = Math.max(0, p.monthlyExpense);
  const monthlySavings = Math.max(0, p.monthlySavings);
  const annualExpenseNow = monthlyExpense * 12;
  const annualSavings = monthlySavings * 12;

  // ── Return tertimbang alokasi ──
  const totalPct = Math.max(1, p.stockPct + p.bondPct + p.cashPct);
  const weightedReturn =
    ((p.stockPct / totalPct) * p.stockReturn +
      (p.bondPct / totalPct) * p.bondReturn +
      (p.cashPct / totalPct) * p.cashReturn) /
    100;

  // ── Tabungan darurat ──
  const emergencyTarget = monthlyExpense * p.emergencyMonths;
  const emergencyGap = Math.max(0, emergencyTarget - p.emergencyCurrent);
  const emergencyProgressPct =
    emergencyTarget > 0 ? Math.min(100, (p.emergencyCurrent / emergencyTarget) * 100) : 100;
  const emergencyMonthsToReach =
    monthlySavings > 0 && emergencyGap > 0 ? Math.ceil(emergencyGap / monthlySavings) : null;
  const emergencyReached = emergencyGap <= 0;

  // ── Dana sekolah anak ──
  const yearsLeft = Math.max(0, LEVEL_AGE[p.schoolLevel] - p.childAge);
  const schoolInflationFactor = 1 + p.schoolInflation / 100;
  const schoolFutureCost = p.childrenCount * p.schoolCostYear * Math.pow(schoolInflationFactor, yearsLeft);
  const schoolCostPerMonth = yearsLeft > 0 && schoolFutureCost > 0 ? schoolFutureCost / (yearsLeft * 12) : 0;

  // ── FIRE: simulasi tahunan ──
  const fireTargetNow = annualExpenseNow * p.fireMultiple;
  const savingsRatePct =
    p.monthlyIncome > 0 ? Math.min(100, (monthlySavings / p.monthlyIncome) * 100) : 0;

  const inflationFactor = 1 + p.inflation / 100;
  let portfolio = p.emergencyCurrent; // mulai dari dana darurat yang sudah ada
  let age = 20; // asumsi usia mulai menghitung
  let yearsToFire: number | null = null;
  let fireAge: number | null = null;

  const projection: YearPoint[] = [];
  for (let y = 1; y <= 60; y++) {
    age = 20 + y;
    const annualExpense = annualExpenseNow * Math.pow(inflationFactor, y);
    const fireTarget = annualExpense * p.fireMultiple;
    // Tumbuhkan portofolio: tambah tabungan tahunan, lalu beri return
    portfolio = (portfolio + annualSavings) * (1 + weightedReturn);
    const reached = portfolio >= fireTarget;
    projection.push({
      year: y,
      age,
      portfolio: Math.round(portfolio),
      annualExpense: Math.round(annualExpense),
      fireTarget: Math.round(fireTarget),
      fireReached: reached,
    });
    if (reached && yearsToFire === null) {
      yearsToFire = y;
      fireAge = age;
      break;
    }
  }

  return {
    emergencyTarget: Math.round(emergencyTarget),
    emergencyGap: Math.round(emergencyGap),
    emergencyProgressPct: Math.round(emergencyProgressPct),
    emergencyMonthsToReach,
    emergencyReached,
    schoolYearsLeft: yearsLeft,
    schoolFutureCost: Math.round(schoolFutureCost),
    schoolCostPerMonth: Math.round(schoolCostPerMonth),
    weightedReturn: Math.round(weightedReturn * 1000) / 10,
    annualSavings: Math.round(annualSavings),
    annualExpenseNow: Math.round(annualExpenseNow),
    fireTargetNow: Math.round(fireTargetNow),
    yearsToFire,
    fireAge,
    fireReached: yearsToFire !== null,
    savingsRatePct: Math.round(savingsRatePct),
    projection,
  };
}
