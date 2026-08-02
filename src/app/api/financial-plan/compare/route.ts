import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { financialPlans, budgets, subscriptions, financeCategories } from "@/lib/db/schema";
import { monthlySummary } from "@/lib/db/finance-repo";

/**
 * GET /api/financial-plan/compare — perbandingan RENCANA (form) vs AKTUAL (Finance) bulan berjalan.
 * Menghitung 8 aspek insight: pemasukan, pengeluaran+proyeksi, budget per kategori,
 * tabungan, alokasi 50/30/20, top kategori, langganan, darurat.
 */
export async function GET() {
  const month = new Date().toISOString().slice(0, 7);
  const plan = db.select().from(financialPlans).orderBy(sql`updated_at desc`).limit(1).get();
  const summary = monthlySummary(month);

  // Budget aktif: period kosong (berlaku tiap bulan) atau period = bulan ini
  const budgetRows = db
    .select({ id: budgets.id, categoryId: budgets.categoryId, limitAmount: budgets.limitAmount, period: budgets.period })
    .from(budgets)
    .all();
  const categories = db.select().from(financeCategories).all();
  const subs = db.select().from(subscriptions).all();

  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const catType = new Map(categories.map((c) => [c.id, c.type]));

  // Aktual per kategori (dari summary) — map nama → total
  const aktualByCat = new Map<string, number>();
  for (const k of summary.kategori) aktualByCat.set(k.nama, k.total);

  // Budget per kategori (gabung dengan nama)
  const budgetList = budgetRows
    .filter((b) => !b.period || b.period === month)
    .map((b) => {
      const nama = catName.get(b.categoryId) ?? "Tanpa kategori";
      return {
        kategori: nama,
        limit: b.limitAmount,
        aktual: aktualByCat.get(nama) ?? 0,
        pct: b.limitAmount > 0 ? Math.round(((aktualByCat.get(nama) ?? 0) / b.limitAmount) * 100) : 0,
        status: (() => {
          const a = aktualByCat.get(nama) ?? 0;
          if (a <= 0) return "belum";
          if (a > b.limitAmount) return "melampaui";
          if (a > b.limitAmount * 0.8) return "hampir";
          return "aman";
        })(),
      };
    });

  // Top kategori pengeluaran (aktual)
  const topKategori = summary.kategori.slice(0, 5).map((k, i) => ({
    rank: i + 1,
    nama: k.nama,
    total: k.total,
    pctOfTotal: summary.keluar > 0 ? Math.round((k.total / summary.keluar) * 100) : 0,
  }));

  // Langganan aktif (bulanan + tahunan disetahunkan → /12)
  const subscriptionTotal = subs
    .filter((s) => s.active)
    .reduce((acc, s) => acc + (s.cycle === "bulanan" ? s.amount : Math.round(s.amount / 12)), 0);

  const rencanaIncome = plan?.monthlyIncome ?? 0;
  const rencanaExpense = plan?.monthlyExpense ?? 0;
  const rencanaSavings = plan?.monthlySavings ?? 0;
  const aktualIncome = summary.masuk;
  const aktualExpense = summary.keluar;

  // Proyeksi akhir bulan: tren pengeluaran hari berjalan × 30
  const today = new Date();
  const dayOfMonth = today.getDate();
  const proyeksiAkhir = dayOfMonth > 0 ? Math.round((aktualExpense / dayOfMonth) * 30) : 0;

  // Alokasi 50/30/20 dari pemasukan aktual (kebutuhan/tabungan/keinginan)
  const idealNeed = Math.round(aktualIncome * 0.5);
  const idealSave = Math.round(aktualIncome * 0.3); // tabungan+investasi
  const aktualNeedPct = aktualIncome > 0 ? Math.round((aktualExpense / aktualIncome) * 100) : 0;

  const sisaBulan = aktualIncome - aktualExpense;
  const daruratTarget = rencanaExpense * (plan?.emergencyMonths ?? 6);

  return NextResponse.json({
    data: {
      bulan: month,
      rencana: {
        income: rencanaIncome,
        expense: rencanaExpense,
        savings: rencanaSavings,
        emergencyCurrent: plan?.emergencyCurrent ?? 0,
        emergencyTarget: daruratTarget,
        fireMultiple: plan?.fireMultiple ?? 25,
      },
      aktual: {
        income: aktualIncome,
        expense: aktualExpense,
        sisa: sisaBulan,
        proyeksiAkhir,
        dayOfMonth,
      },
      perbandingan: {
        incomeSelisih: aktualIncome - rencanaIncome,
        incomePct: rencanaIncome > 0 ? Math.round((aktualIncome / rencanaIncome) * 100) : 0,
        expenseSelisih: aktualExpense - rencanaExpense,
        expensePct: rencanaExpense > 0 ? Math.round((aktualExpense / rencanaExpense) * 100) : 0,
        savingsAktual: Math.max(0, sisaBulan),
        savingsPct: rencanaSavings > 0 ? Math.round((Math.max(0, sisaBulan) / rencanaSavings) * 100) : 0,
        boros: aktualExpense > rencanaExpense * 1.05,
        proyeksiBoros: proyeksiAkhir > rencanaExpense * 1.05,
      },
      budget: budgetList,
      topKategori,
      subscriptionTotal,
      alokasi: {
        idealNeed,
        idealSave,
        aktualNeedPct,
        status: aktualNeedPct > 50 ? "kebutuhan-terlalu-tinggi" : aktualNeedPct < 30 ? "kebutuhan-rendah" : "sehat",
      },
      darurat: {
        target: daruratTarget,
        current: plan?.emergencyCurrent ?? 0,
        bisaTambah: Math.max(0, sisaBulan),
      },
      catType: Object.fromEntries(catType),
    },
  });
}
