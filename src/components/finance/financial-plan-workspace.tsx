"use client";

import * as React from "react";
import {
  Briefcase,
  ChevronDown,
  CircleDollarSign,
  Landmark,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { computePlan, fmtRp } from "@/lib/financial-plan";
import type { FinancialAnalysis } from "@/lib/ai/financial-ai";

/* ═══════════ Section collapsible (komponen statis) ═══════════ */

function SectionCard({
  id,
  icon: Icon,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <button onClick={() => onToggle(open ? "" : id)} className="flex w-full items-center gap-2.5 px-4 py-3 text-left">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-[10px] text-muted-foreground">{subtitle}</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-3 border-t border-border/40 p-4">{children}</div>}
    </div>
  );
}

/* ═══════════ Tipe ═══════════ */

interface ChildDraft {
  id: number;
  name: string;
  age: number;
  schoolLevel: string;
  schoolCostYear: number;
}

interface DebtRow {
  id: number;
  party: string;
  amount: number;
  paidAmount: number;
  paymentMode: string;
  installmentCount: number;
  installmentsPaid: number;
  interestRate: number;
  monthlyInstallment: number;
  dueDate: string;
  notes: string;
}

const LEVELS = [
  { value: "sd", label: "SD" },
  { value: "smp", label: "SMP" },
  { value: "sma", label: "SMA" },
  { value: "kuliah", label: "Kuliah" },
];

/** Halaman Financial Planning — profil lengkap + anak + cicilan + analisa AI (FIRE/dividen/darurat). */
export function FinancialPlanWorkspace() {
  const [form, setForm] = React.useState({
    age: 30,
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
    schoolInflation: 10,
    dividendTarget: 12000000,
    dividendYield: 5,
  });
  const [children, setChildren] = React.useState<ChildDraft[]>([]);
  const [debtsList, setDebtsList] = React.useState<DebtRow[]>([]);
  const [analysis, setAnalysis] = React.useState<FinancialAnalysis | null>(null);
  const [actualIncome, setActualIncome] = React.useState(0);
  const [actualExpense, setActualExpense] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);

  /* ── Section collapsible ── */
  const [openSection, setOpenSection] = React.useState<string | null>("profil");
  const [debtFormOpen, setDebtFormOpen] = React.useState(false);
  const [debtDraft, setDebtDraft] = React.useState({ party: "", amount: 0, installmentCount: 1, interestRate: 0, monthlyInstallment: 0, dueDate: "" });
  const childIdRef = React.useRef(1);

  const set = (key: keyof typeof form, val: number) => setForm((prev) => ({ ...prev, [key]: val }));

  const liveResult = React.useMemo(() => {
    const p = {
      ...form,
      childrenCount: children.length,
      childAge: children[0]?.age ?? 0,
      schoolLevel: (children[0]?.schoolLevel ?? "kuliah") as "sd" | "smp" | "sma" | "kuliah",
      schoolCostYear: children[0]?.schoolCostYear ?? 0,
    };
    return computePlan(p as never);
  }, [form, children]);

  /* ── Load ── */
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/financial-plan");
        const json = await res.json();
        if (cancelled) return;
        if (json.data) {
          const d = json.data;
          setForm((prev) => ({
            ...prev,
            age: d.age || prev.age,
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
            schoolInflation: d.schoolInflation,
            dividendTarget: d.dividendTarget ?? prev.dividendTarget,
            dividendYield: d.dividendYield ?? prev.dividendYield,
          }));
          if (json.children?.length) {
            setChildren(
              json.children.map((c: { id: number; name: string; age: number; schoolLevel: string; schoolCostYear: number }) => ({
                id: c.id,
                name: c.name,
                age: c.age,
                schoolLevel: c.schoolLevel,
                schoolCostYear: c.schoolCostYear,
              }))
            );
          }
          setDebtsList(json.debts ?? []);
          if (d.analysis) {
            try {
              setAnalysis(JSON.parse(d.analysis));
            } catch {
              setAnalysis(null);
            }
          }
        }
      } catch {
        // default
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    // Data aktual bulan berjalan dari fitur Finance
    fetch("/api/finance/summary")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.data) {
          setActualIncome(j.data.masuk ?? 0);
          setActualExpense(j.data.keluar ?? 0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Save ── */
  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/financial-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, children }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success("Profil keuangan tersimpan 💾");
    } catch {
      toast.error("Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  /* ── Analisa AI ── */
  const analyze = async () => {
    if (!liveResult) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/financial-plan/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ age: form.age, dividendTarget: form.dividendTarget }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      setAnalysis(json.data);
      toast.success("Analisa AI selesai ✨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal analisa");
    } finally {
      setAnalyzing(false);
    }
  };

  /* ── Anak ── */
  const addChild = () =>
    setChildren((prev) => [
      ...prev,
      { id: childIdRef.current++, name: `Anak ${prev.length + 1}`, age: 5, schoolLevel: "kuliah", schoolCostYear: 25000000 },
    ]);
  const updChild = (id: number, patch: Partial<ChildDraft>) =>
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const delChild = (id: number) => setChildren((prev) => prev.filter((c) => c.id !== id));

  /* ── Cicilan (tambah via API debts) ── */
  const addDebt = async () => {
    const party = debtDraft.party.trim();
    if (!party || debtDraft.amount <= 0) {
      toast.error("Isi nama cicilan & nominalnya 🏦");
      return;
    }
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "hutang",
          party,
          amount: debtDraft.amount,
          paymentMode: "cicilan",
          installmentCount: debtDraft.installmentCount,
          interestRate: debtDraft.interestRate,
          monthlyInstallment: debtDraft.monthlyInstallment,
          dueDate: debtDraft.dueDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success("Cicilan ditambahkan 🏦");
      setDebtDraft({ party: "", amount: 0, installmentCount: 1, interestRate: 0, monthlyInstallment: 0, dueDate: "" });
      setDebtFormOpen(false);
      const r = await fetch("/api/financial-plan");
      const j = await r.json();
      setDebtsList(j.debts ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah cicilan");
    }
  };

  const delDebt = async (id: number) => {
    try {
      const res = await fetch(`/api/debts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDebtsList((prev) => prev.filter((d) => d.id !== id));
      toast.success("Cicilan dihapus");
    } catch {
      toast.error("Gagal menghapus cicilan");
    }
  };

  /* ═══ Kalkulasi dividen ═══ */
  const dividendModal = form.dividendTarget > 0 ? Math.round(form.dividendTarget / (form.dividendYield / 100)) : 0;
  const weightedReturn = liveResult?.weightedReturn ?? 0;


  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Memuat profil keuangan…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <Briefcase className="size-5 text-primary" />
          </span>
          Financial Planning
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profil keuangan lengkap — anak, cicilan, investasi & target dividen. AI merancang prioritas lunas & alokasi terbaik.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        {/* ═══ FORM (kiri) ═══ */}
        <div className="space-y-3">
          <SectionCard id="profil" icon={Wallet} title="Profil & Cashflow" subtitle="Usia, pemasukan, pengeluaran, tabungan bulanan" open={openSection === "profil"} onToggle={setOpenSection}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Usia sekarang</label>
                <Input type="number" value={form.age || ""} onChange={(e) => set("age", Number(e.target.value) || 0)} className="h-9 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tabungan per bulan</label>
                <RupiahInput value={form.monthlySavings} onChange={(v) => set("monthlySavings", v)} className="h-9" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pemasukan bulanan</label>
              <RupiahInput value={form.monthlyIncome} onChange={(v) => set("monthlyIncome", v)} className="h-9" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pengeluaran bulanan</label>
              <RupiahInput value={form.monthlyExpense} onChange={(v) => set("monthlyExpense", v)} className="h-9" />
            </div>
          </SectionCard>

          <SectionCard id="anak" icon={Users} title="Anak & Dana Pendidikan" subtitle="Daftar anak (bisa banyak) + biaya pendidikan target" open={openSection === "anak"} onToggle={setOpenSection}>
            <div className="space-y-2.5">
              {children.length === 0 && (
                <p className="rounded-lg border border-dashed border-border/70 p-3 text-center text-[11px] text-muted-foreground">
                  Belum ada anak — tambahkan untuk hitung dana pendidikan.
                </p>
              )}
              {children.map((c, i) => (
                <div key={c.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <Input value={c.name} onChange={(e) => updChild(c.id, { name: e.target.value })} className="h-8 flex-1 text-sm" />
                    <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => delChild(c.id)} aria-label="Hapus anak">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Usia</label>
                      <Input type="number" value={c.age || ""} onChange={(e) => updChild(c.id, { age: Number(e.target.value) || 0 })} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Jenjang target</label>
                      <select
                        value={c.schoolLevel}
                        onChange={(e) => updChild(c.id, { schoolLevel: e.target.value })}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {LEVELS.map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Biaya pendidikan per tahun (sekarang)</label>
                    <RupiahInput value={c.schoolCostYear} onChange={(v) => updChild(c.id, { schoolCostYear: v })} className="h-8" />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={addChild}>
                <Plus className="size-3.5" /> Tambah anak
              </Button>
            </div>
          </SectionCard>

          <SectionCard id="cicilan" icon={Landmark} title="Cicilan & Hutang" subtitle="Beban cicilan multiple — dianalisa AI urutan pelunasan" open={openSection === "cicilan"} onToggle={setOpenSection}>
            <div className="space-y-2">
              {debtsList.length === 0 && (
                <p className="rounded-lg border border-dashed border-border/70 p-3 text-center text-[11px] text-muted-foreground">
                  Belum ada cicilan tercatat.
                </p>
              )}
              {debtsList.map((d) => {
                const sisa = Math.max(0, d.amount - d.paidAmount);
                return (
                  <div key={d.id} className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-xs font-semibold">{d.party}</p>
                      <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive" onClick={() => void delDebt(d.id)} aria-label="Hapus cicilan">
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>Sisa: <b className="text-foreground">{fmtRp(sisa)}</b></span>
                      {d.monthlyInstallment > 0 && <span>Angsuran: {fmtRp(d.monthlyInstallment)}/bln</span>}
                      {d.interestRate > 0 && <span className="text-amber-600 dark:text-amber-400">Bunga {d.interestRate}%/thn</span>}
                      {d.dueDate && <span>Jatuh tempo: {d.dueDate}</span>}
                      <span>{d.installmentsPaid}/{d.installmentCount}x</span>
                    </div>
                  </div>
                );
              })}

              {/* Form tambah cicilan */}
              <div className="overflow-hidden rounded-lg border border-primary/20 bg-primary/[0.04]">
                <button onClick={() => setDebtFormOpen((o) => !o)} className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-semibold text-primary">
                  <Plus className={cn("size-3.5 transition-transform", debtFormOpen && "rotate-45")} />
                  {debtFormOpen ? "Tutup form cicilan" : "Tambah cicilan"}
                </button>
                {debtFormOpen && (
                  <div className="space-y-2 border-t border-border/40 p-3">
                    <Input value={debtDraft.party} onChange={(e) => setDebtDraft((p) => ({ ...p, party: e.target.value }))} placeholder="Nama cicilan (mis. KPR, kredit motor)" className="h-8 text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Sisa pokok</label>
                        <RupiahInput value={debtDraft.amount} onChange={(v) => setDebtDraft((p) => ({ ...p, amount: v }))} className="h-8" />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Tenor (x cicilan)</label>
                        <Input type="number" value={debtDraft.installmentCount || ""} onChange={(e) => setDebtDraft((p) => ({ ...p, installmentCount: Number(e.target.value) || 1 }))} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Angsuran/bulan</label>
                        <RupiahInput value={debtDraft.monthlyInstallment} onChange={(v) => setDebtDraft((p) => ({ ...p, monthlyInstallment: v }))} className="h-8" />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Bunga %/thn</label>
                        <Input type="number" value={debtDraft.interestRate || ""} onChange={(e) => setDebtDraft((p) => ({ ...p, interestRate: Number(e.target.value) || 0 }))} className="h-8 text-sm" placeholder="0 = tanpa bunga" />
                      </div>
                    </div>
                    <Input type="date" value={debtDraft.dueDate} onChange={(e) => setDebtDraft((p) => ({ ...p, dueDate: e.target.value }))} className="h-8 text-sm" />
                    <Button size="sm" className="h-8 w-full gap-1 text-xs" onClick={() => void addDebt()}>
                      <Landmark className="size-3.5" /> Simpan cicilan
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard id="investasi" icon={TrendingUp} title="Investasi & Target" subtitle="Alokasi, return, FIRE, darurat & target dividen" open={openSection === "investasi"} onToggle={setOpenSection}>
            {/* Alokasi */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Alokasi investasi (Saham {form.stockPct}% · Obligasi {form.bondPct}% · Kas {form.cashPct}%)
              </label>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="bg-primary/80" style={{ width: `${form.stockPct}%` }} />
                <div className="bg-sky-500/70" style={{ width: `${form.bondPct}%` }} />
                <div className="bg-amber-500/70" style={{ width: `${form.cashPct}%` }} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Saham %</label>
                  <Input type="number" value={form.stockPct || ""} onChange={(e) => set("stockPct", Number(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Obligasi %</label>
                  <Input type="number" value={form.bondPct || ""} onChange={(e) => set("bondPct", Number(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Kas %</label>
                  <Input type="number" value={form.cashPct || ""} onChange={(e) => set("cashPct", Number(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Return saham %</label>
                <Input type="number" value={form.stockReturn || ""} onChange={(e) => set("stockReturn", Number(e.target.value) || 0)} className="h-8 text-sm" />
              </div>
              <div>
                <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Inflasi %</label>
                <Input type="number" value={form.inflation || ""} onChange={(e) => set("inflation", Number(e.target.value) || 0)} className="h-8 text-sm" />
              </div>
            </div>

            {/* Darurat */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                <ShieldAlert className="size-3" /> Dana darurat
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Terkumpul</label>
                  <RupiahInput value={form.emergencyCurrent} onChange={(v) => set("emergencyCurrent", v)} className="h-8" />
                </div>
                <div>
                  <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Target (x pengeluaran)</label>
                  <Input type="number" value={form.emergencyMonths || ""} onChange={(e) => set("emergencyMonths", Number(e.target.value) || 6)} className="h-8 text-sm" />
                </div>
              </div>
            </div>

            {/* FIRE */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                <CircleDollarSign className="size-3" /> Target FIRE (Financial Independence)
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Pengali FIRE</label>
                  <Input type="number" value={form.fireMultiple || ""} onChange={(e) => set("fireMultiple", Number(e.target.value) || 25)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Inflasi pendidikan %</label>
                  <Input type="number" value={form.schoolInflation || ""} onChange={(e) => set("schoolInflation", Number(e.target.value) || 10)} className="h-8 text-sm" />
                </div>
              </div>
            </div>

            {/* Dividen */}
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-2.5">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-3" /> Target dividen pasif
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Dividen target / tahun</label>
                  <RupiahInput value={form.dividendTarget} onChange={(v) => set("dividendTarget", v)} className="h-8" />
                </div>
                <div>
                  <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Yield dividen %</label>
                  <Input type="number" value={form.dividendYield || ""} onChange={(e) => set("dividendYield", Number(e.target.value) || 5)} className="h-8 text-sm" />
                </div>
              </div>
              {dividendModal > 0 && (
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Butuh modal <b className="text-emerald-600 dark:text-emerald-400">{fmtRp(dividendModal)}</b> untuk dividen {fmtRp(form.dividendTarget)}/tahun @ {form.dividendYield}%
                </p>
              )}
            </div>
          </SectionCard>

          <div className="flex items-center gap-2">
            <Button onClick={() => void save()} disabled={saving} className="h-10 gap-1.5 px-5">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Simpan profil
            </Button>
            <Button
              variant="outline"
              className="h-10 gap-1.5 px-5"
              onClick={() => void analyze()}
              disabled={analyzing}
            >
              {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {analysis ? "Analisa ulang" : "Analisa AI"}
            </Button>
          </div>
        </div>

        {/* ═══ HASIL (kanan) ═══ */}
        <div className="space-y-3">
          {/* Alert boros — live dari Finance aktual */}
          {actualExpense > form.monthlyExpense * 1.05 && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.07] p-3.5 shadow-sm">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <ShieldAlert className="size-3.5" /> ⚠️ Kamu boros bulan ini!
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-foreground/85">
                Pengeluaran aktual <b>{fmtRp(actualExpense)}</b> sudah melebihi rencana <b>{fmtRp(form.monthlyExpense)}</b> (+
                {fmtRp(actualExpense - form.monthlyExpense)}). Cek detail di fitur <b>Finance</b> dan kurangi pengeluaran non-esensial.
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-rose-500"
                  style={{ width: `${Math.min(100, Math.round((actualExpense / Math.max(1, form.monthlyExpense)) * 100))}%` }}
                />
              </div>
              <p className="mt-1 text-[9px] text-muted-foreground">
                {fmtRp(actualExpense)} / {fmtRp(form.monthlyExpense)} rencana
              </p>
            </div>
          )}

          {/* Ringkasan live */}
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <Wallet className="size-3.5 text-primary" /> Ringkasan rencana
            </p>
            <div className="mt-2.5 space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pemasukan aktual (bulan ini)</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtRp(actualIncome)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pengeluaran aktual (bulan ini)</span>
                <span className={cn("font-semibold", actualExpense > form.monthlyExpense ? "text-rose-600 dark:text-rose-400" : "")}>
                  {fmtRp(actualExpense)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Dana darurat</span>
                <span className={cn("font-semibold", liveResult.emergencyReached ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                  {liveResult.emergencyReached ? "Tercapai ✅" : `${fmtRp(liveResult.emergencyTarget)} (gap ${fmtRp(liveResult.emergencyGap)})`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">FIRE (${form.fireMultiple}x)</span>
                <span className="font-semibold">
                  {liveResult.fireReached ? "Tercapai ✅" : `${liveResult.yearsToFire ?? "—"} tahun (usia ${liveResult.fireAge ?? "—"})`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Return tertimbang</span>
                <span className="font-semibold">{weightedReturn.toFixed(1)}%/thn</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Saving rate</span>
                <span className="font-semibold">{liveResult.savingsRatePct}%</span>
              </div>
              {children.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Dana sekolah (anak pertama)</span>
                  <span className="font-semibold">{fmtRp(liveResult.schoolCostPerMonth)}/bln</span>
                </div>
              )}
              {dividendModal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Modal dividen</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtRp(dividendModal)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Panel AI */}
          <div className="overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Analisa AI</p>
                <p className="text-[10px] text-muted-foreground">Prioritas lunas cicilan & alokasi dana</p>
              </div>
              {analysis && (
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => void analyze()} disabled={analyzing}>
                  {analyzing ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                  Ulang
                </Button>
              )}
            </div>

            {!analysis ? (
              <div className="space-y-2 p-4">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Simpan profil lalu klik <b>Analisa AI</b> — AI akan menyusun urutan pelunasan cicilan, alokasi dana darurat/investasi, dan roadmap menuju dividen pasif.
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5 text-[10px] text-muted-foreground">
                  <ShieldAlert className="size-3.5 shrink-0 text-primary" />
                  Analisa ini anti-riba: tidak ada saran bunga — cicilan diurutkan dari sisa kecil & tenor pendek.
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                <p className="rounded-lg border border-border/50 bg-muted/20 p-2.5 text-[11px] leading-relaxed">{analysis.ringkasan}</p>

                {/* Status boros (hasil AI) */}
                {analysis.statusBoros?.boros && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.07] p-2.5">
                    <p className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      <ShieldAlert className="size-3" /> Terdeteksi boros bulan ini
                    </p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-foreground/85">{analysis.statusBoros.pesan}</p>
                  </div>
                )}

                {/* Alokasi % dari pemasukan */}
                {analysis.alokasiPersen && (
                  <div>
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      💹 Alokasi pemasukan yang disarankan
                    </p>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className="bg-sky-500/80" style={{ width: `${analysis.alokasiPersen.kebutuhan}%` }} />
                      <div className="bg-primary/80" style={{ width: `${analysis.alokasiPersen.tabungan}%` }} />
                      <div className="bg-emerald-500/80" style={{ width: `${analysis.alokasiPersen.investasi}%` }} />
                      <div className="bg-amber-500/80" style={{ width: `${analysis.alokasiPersen.cicilan}%` }} />
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-1.5 text-center">
                      {[
                        { label: "Kebutuhan", v: analysis.alokasiPersen.kebutuhan, cls: "text-sky-600 dark:text-sky-400" },
                        { label: "Tabungan", v: analysis.alokasiPersen.tabungan, cls: "text-primary" },
                        { label: "Investasi", v: analysis.alokasiPersen.investasi, cls: "text-emerald-600 dark:text-emerald-400" },
                        { label: "Cicilan", v: analysis.alokasiPersen.cicilan, cls: "text-amber-600 dark:text-amber-400" },
                      ].map((x) => (
                        <div key={x.label} className="rounded-lg bg-muted/40 p-1.5">
                          <p className={cn("text-xs font-bold", x.cls)}>{x.v}%</p>
                          <p className="text-[8px] text-muted-foreground">{x.label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{analysis.alokasiPersen.penjelasan}</p>
                  </div>
                )}

                {/* Insight tokoh */}
                {analysis.insightTokoh && analysis.insightTokoh.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      🧠 Insight para investor legendaris
                    </p>
                    <div className="space-y-1.5">
                      {analysis.insightTokoh.map((t, i) => (
                        <div key={i} className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                          <p className="flex items-center gap-1 text-[10px] font-bold">
                            <span className="flex size-4 items-center justify-center rounded-full bg-primary/15 text-[8px] text-primary">{i + 1}</span>
                            {t.tokoh}
                          </p>
                          <p className="mt-1 text-[10px] leading-relaxed text-primary/70 italic">&ldquo;{t.quote}&rdquo;</p>
                          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{t.penerapan}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prioritas lunas */}
                {analysis.prioritasLunas.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">🏆 Urutan lunasi cicilan</p>
                    <ol className="space-y-1.5">
                      {analysis.prioritasLunas.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 p-2">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                            {i + 1}
                          </span>
                          <span className="text-[10px] leading-relaxed">
                            <b>{p.nama}</b> — {p.alasan}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Alokasi */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-[8px] font-semibold uppercase text-muted-foreground">Dana darurat</p>
                    <p className="mt-0.5 text-[10px] leading-snug">{analysis.alokasi.danaDarurat}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-[8px] font-semibold uppercase text-muted-foreground">Investasi bulanan</p>
                    <p className="mt-0.5 text-[10px] leading-snug">{analysis.alokasi.investasiBulanan}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <p className="text-[8px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Modal dividen</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-foreground/85">{analysis.alokasi.modalDividen}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <p className="text-[8px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Estimasi tercapai</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-foreground/85">{analysis.alokasi.estimasiTahunDividen}</p>
                  </div>
                </div>

                {/* Roadmap */}
                {analysis.roadmap.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">🗺️ Roadmap</p>
                    <div className="space-y-1">
                      {analysis.roadmap.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-[10px] leading-relaxed">
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[8px] font-bold text-primary">{i + 1}</span>
                          <span className="text-foreground/85">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.catatanAntiRiba && (
                  <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] p-2.5 text-[10px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                    🕌 {analysis.catatanAntiRiba}
                  </p>
                )}
              </div>
            )}
          </div>

          <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">
            💡 Hasil analisa tersimpan otomatis — tidak berbayar saat dibuka ulang. Klik &quot;Analisa ulang&quot; untuk fresh dari kondisi terbaru.
          </p>
        </div>
      </div>
    </div>
  );
}
