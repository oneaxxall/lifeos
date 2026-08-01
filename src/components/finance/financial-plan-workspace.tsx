"use client";

import * as React from "react";
import {
  Briefcase,
  Calculator,
  GraduationCap,
  Loader2,
  PiggyBank,
  Save,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { cn } from "@/lib/utils";
import { computePlan, fmtRp, type PlanResult } from "@/lib/financial-plan";

const DEFAULT_FORM = {
  monthlyIncome: 15000000,
  monthlyExpense: 8000000,
  monthlySavings: 4000000,
  emergencyMonths: 6,
  emergencyCurrent: 5000000,
  stockPct: 60,
  bondPct: 30,
  cashPct: 10,
  stockReturn: 12,
  bondReturn: 6,
  cashReturn: 4,
  inflation: 4,
  fireMultiple: 25,
  childrenCount: 1,
  childAge: 5,
  schoolLevel: "kuliah",
  schoolCostYear: 25000000,
  schoolInflation: 10,
} as const;

type FormState = typeof DEFAULT_FORM;

/** Halaman Financial Planning — FIRE calculator + dana sekolah + tabungan darurat. */
export function FinancialPlanWorkspace() {
  const [form, setForm] = React.useState<FormState>({ ...DEFAULT_FORM });
  const [result, setResult] = React.useState<PlanResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/financial-plan");
        const json = await res.json();
        if (cancelled) return;
        if (json.data) {
          const d = json.data;
          setForm({
            monthlyIncome: d.monthlyIncome,
            monthlyExpense: d.monthlyExpense,
            monthlySavings: d.monthlySavings,
            emergencyMonths: d.emergencyMonths,
            emergencyCurrent: d.emergencyCurrent,
            stockPct: d.stockPct,
            bondPct: d.bondPct,
            cashPct: d.cashPct,
            stockReturn: d.stockReturn,
            bondReturn: d.bondReturn,
            cashReturn: d.cashReturn,
            inflation: d.inflation,
            fireMultiple: d.fireMultiple,
            childrenCount: d.childrenCount,
            childAge: d.childAge,
            schoolLevel: d.schoolLevel,
            schoolCostYear: d.schoolCostYear,
            schoolInflation: d.schoolInflation,
          });
          setResult(json.result ?? null);
        }
      } catch {
        // biarkan default
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (key: keyof FormState, val: number | string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const liveResult = React.useMemo(() => computePlan(form as never), [form]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/financial-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      setResult(json.result ?? null);
      toast.success("Rencana keuangan tersimpan 💾");
    } catch {
      toast.error("Gagal menyimpan rencana");
    } finally {
      setSaving(false);
    }
  };

  const r = result ?? liveResult;
  const saved = result !== null;

  const numInput = (
    label: string,
    key: keyof FormState,
    opts?: { prefix?: string; suffix?: string; rupiah?: boolean }
  ) => {
    const { prefix, suffix, rupiah } = opts ?? {};
    return (
      <label className="block">
        <span className="mb-1 block text-[10px] font-medium text-muted-foreground">{label}</span>
        <div className="relative">
          {prefix && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {prefix}
            </span>
          )}
          {rupiah ? (
            <RupiahInput
              value={Number(form[key])}
              onChange={(v) => set(key, v)}
              prefix
              className="h-8"
            />
          ) : (
            <Input
              type="number"
              value={Number(form[key])}
              onChange={(e) => set(key, Number(e.target.value))}
              className={cn("h-8 text-sm", prefix && "pl-10")}
            />
          )}
          {suffix && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
      </label>
    );
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Calculator className="size-6 text-primary" /> Financial Planning
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rencanakan masa depan: FIRE (Financial Independence Retire Early), dana sekolah anak,
          dan tabungan darurat — lengkap dengan alokasi investasi.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Loader2 className="size-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat…</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          {/* ── Form asumsi ── */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {/* Pemasukan & pengeluaran */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Briefcase className="size-4 text-primary" /> Pemasukan & pengeluaran
              </p>
              <div className="space-y-2.5">
                {numInput("Pemasukan per bulan", "monthlyIncome", { prefix: "Rp", rupiah: true })}
                {numInput("Pengeluaran per bulan", "monthlyExpense", { prefix: "Rp", rupiah: true })}
                {numInput("Nabung / investasi per bulan", "monthlySavings", { prefix: "Rp", rupiah: true })}
              </div>
            </div>

            {/* Alokasi investasi */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="size-4 text-primary" /> Alokasi investasi
              </p>
              <div className="grid grid-cols-3 gap-2">
                {numInput("Saham %", "stockPct", { suffix: "%" })}
                {numInput("Obligasi %", "bondPct", { suffix: "%" })}
                {numInput("Deposito %", "cashPct", { suffix: "%" })}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {numInput("Return saham", "stockReturn", { suffix: "%" })}
                {numInput("Return obligasi", "bondReturn", { suffix: "%" })}
                {numInput("Return deposito", "cashReturn", { suffix: "%" })}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {numInput("Inflasi", "inflation", { suffix: "%" })}
                {numInput("Pengali FIRE (x)", "fireMultiple", { suffix: "x" })}
              </div>
            </div>

            {/* Dana darurat */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <ShieldAlert className="size-4 text-amber-500" /> Tabungan darurat
              </p>
              <div className="grid grid-cols-2 gap-2">
                {numInput("Target (x pengeluaran)", "emergencyMonths", { suffix: "x" })}
                {numInput("Sudah terkumpul", "emergencyCurrent", { prefix: "Rp", rupiah: true })}
              </div>
            </div>

            {/* Dana sekolah */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <GraduationCap className="size-4 text-indigo-500" /> Dana sekolah anak
              </p>
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  {numInput("Jumlah anak", "childrenCount", { suffix: "anak" })}
                  {numInput("Usia anak tertua", "childAge", { suffix: "thn" })}
                </div>
                <div>
                  <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    Jenjang target
                  </span>
                  <Select value={form.schoolLevel} onValueChange={(v) => set("schoolLevel", v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sd">SD (7 thn)</SelectItem>
                      <SelectItem value="smp">SMP (13 thn)</SelectItem>
                      <SelectItem value="sma">SMA (16 thn)</SelectItem>
                      <SelectItem value="kuliah">Kuliah (19 thn)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {numInput("Biaya/thn sekarang", "schoolCostYear", { prefix: "Rp", rupiah: true })}
                  {numInput("Inflasi pendidikan", "schoolInflation", { suffix: "%" })}
                </div>
              </div>
            </div>

            <Button onClick={() => void save()} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Menyimpan…" : saved ? "Simpan & perbarui" : "Simpan rencana"}
            </Button>
          </div>

          {/* ── Hasil ── */}
          <div className="space-y-5">
            {/* Ringkasan utama */}
            <div className="rounded-xl border border-border bg-gradient-to-br from-primary/[0.07] via-card to-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Savings rate
                  </p>
                  <p className="mt-1 text-3xl font-bold text-primary">{r.savingsRatePct}%</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    dari pemasukan per bulan ({fmtRp(r.annualSavings / 12)}/bulan)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Return portofolio (tertimbang)
                  </p>
                  <p className="mt-1 text-3xl font-bold text-emerald-500">{r.weightedReturn}%</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    saham {form.stockPct}% · obligasi {form.bondPct}% · deposito {form.cashPct}%
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-primary"
                  style={{ width: `${Math.min(100, r.savingsRatePct)}%` }}
                />
              </div>
            </div>

            {/* FIRE */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <PiggyBank className="size-4 text-rose-500" /> FIRE — Financial Independence, Retire Early
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] text-muted-foreground">Target FIRE</p>
                  <p className="mt-1 text-lg font-bold">{fmtRp(r.fireTargetNow)}</p>
                  <p className="text-[10px] text-muted-foreground">{form.fireMultiple}× pengeluaran tahunan</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Pengeluaran/thn (sekarang)</p>
                  <p className="mt-1 text-lg font-bold">{fmtRp(r.annualExpenseNow)}</p>
                  <p className="text-[10px] text-muted-foreground">naik {form.inflation}% per tahun</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Tabungan/thn</p>
                  <p className="mt-1 text-lg font-bold">{fmtRp(r.annualSavings)}</p>
                  <p className="text-[10px] text-muted-foreground">dari nabung bulanan</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Estimasi FIRE</p>
                  <p className={cn("mt-1 text-lg font-bold", r.fireReached ? "text-emerald-500" : "")}>
                    {r.fireReached ? `${r.yearsToFire} tahun` : "> 60 tahun"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.fireAge ? `usia ±${r.fireAge} tahun` : "perlu nabung lebih"}
                  </p>
                </div>
              </div>
              {r.fireReached ? (
                <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                  🎉 Kamu bisa FIRE dalam ±{r.yearsToFire} tahun (usia ±{r.fireAge}) dengan
                  tabungan {fmtRp(r.annualSavings)}/tahun dan return {r.weightedReturn}%.
                </p>
              ) : (
                <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Dengan asumsi saat ini, target FIRE belum tercapai dalam 60 tahun. Coba
                  naikkan nabung bulanan atau alokasi saham.
                </p>
              )}
            </div>

            {/* Tabungan darurat */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <ShieldAlert className="size-4 text-amber-500" /> Tabungan darurat
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-muted-foreground">
                      {fmtRp(form.emergencyCurrent)} / {fmtRp(r.emergencyTarget)}
                    </p>
                    <p className="text-sm font-bold">{r.emergencyProgressPct}%</p>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        r.emergencyReached ? "bg-emerald-500" : "bg-amber-500"
                      )}
                      style={{ width: `${r.emergencyProgressPct}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Estimasi capai target</p>
                  <p className="text-lg font-bold">
                    {r.emergencyReached
                      ? "Sudah tercapai 🎉"
                      : r.emergencyMonthsToReach !== null
                        ? `±${r.emergencyMonthsToReach} bulan`
                        : "—"}
                  </p>
                  {!r.emergencyReached && r.emergencyGap > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      kurang {fmtRp(r.emergencyGap)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Dana sekolah */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <GraduationCap className="size-4 text-indigo-500" /> Dana sekolah anak
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Sisa waktu</p>
                  <p className="mt-1 text-lg font-bold">{r.schoolYearsLeft} tahun</p>
                  <p className="text-[10px] text-muted-foreground">
                    {form.childrenCount} anak · usia {form.childAge}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Kebutuhan saat masuk (est.)</p>
                  <p className="mt-1 text-lg font-bold">{fmtRp(r.schoolFutureCost)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    inflasi pendidikan {form.schoolInflation}%/thn
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Tabungan per bulan</p>
                  <p className="mt-1 text-lg font-bold text-indigo-500">
                    {r.schoolCostPerMonth > 0 ? fmtRp(r.schoolCostPerMonth) : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    selama {r.schoolYearsLeft} tahun
                  </p>
                </div>
              </div>
              {r.schoolYearsLeft <= 0 && (
                <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Usia anak sudah melewati jenjang ini — pilih jenjang berikutnya.
                </p>
              )}
            </div>

            {/* Grafik proyeksi */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="size-4 text-primary" /> Proyeksi portofolio menuju FIRE
              </p>
              <div className="space-y-1">
                {r.projection.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Belum ada proyeksi.
                  </p>
                ) : (
                  <>
                    {/* Bar per 5 tahun */}
                    <div className="flex items-end gap-1.5 pt-2" style={{ height: 140 }}>
                      {r.projection
                        .filter((_, i) => i % 3 === 0)
                        .map((pt) => {
                          const maxVal = Math.max(
                            ...r.projection.map((x) => x.fireTarget),
                            1
                          );
                          const h = Math.max(4, (pt.portfolio / maxVal) * 130);
                          return (
                            <div
                              key={pt.year}
                              className="flex-1"
                              title={`Tahun ${pt.year} (usia ${pt.age}): ${fmtRp(pt.portfolio)}`}
                            >
                              <div
                                className={cn(
                                  "w-full rounded-t transition-all",
                                  pt.fireReached ? "bg-emerald-500" : "bg-primary/70"
                                )}
                                style={{ height: h }}
                              />
                            </div>
                          );
                        })}
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>Tahun 1</span>
                      <span>Tahun {Math.floor(r.projection.length / 2)}</span>
                      <span>Tahun {r.projection.length}</span>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Tinggi bar ≈ nilai portofolio (bar hijau = FIRE tercapai). Klik bar untuk
                      detail nilai.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
