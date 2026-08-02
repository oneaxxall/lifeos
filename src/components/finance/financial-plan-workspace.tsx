"use client";

import * as React from "react";
import {
  Briefcase,
  ChevronDown,
  CircleDollarSign,
  GraduationCap,
  Landmark,
  Loader2,
  MessageSquareText,
  Plus,
  Save,
  Send,
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
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { computePlan, fmtRp } from "@/lib/financial-plan";
import type { FinancialAnalysis } from "@/lib/ai/financial-ai";

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
  installmentCount: number;
  installmentsPaid: number;
  interestRate: number;
  monthlyInstallment: number;
  dueDate: string;
}

interface ChatRow {
  id: number;
  role: "user" | "assistant";
  message: string;
  createdAt: string;
}

const LEVELS = [
  { value: "sd", label: "SD" },
  { value: "smp", label: "SMP" },
  { value: "sma", label: "SMA" },
  { value: "kuliah", label: "Kuliah" },
];

const LEVEL_AGE: Record<string, number> = { sd: 7, smp: 13, sma: 16, kuliah: 19 };

const TABS = [
  { id: "form", label: "Form", icon: Wallet },
  { id: "fire", label: "FIRE Advisor", icon: CircleDollarSign },
  { id: "darurat", label: "Dana Darurat", icon: ShieldAlert },
  { id: "pendidikan", label: "Dana Pendidikan", icon: GraduationCap },
  { id: "insight", label: "Insight", icon: Sparkles },
  { id: "chat", label: "Chat AI", icon: MessageSquareText },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ═══════════ Section collapsible ═══════════ */

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <button onClick={onToggle} className="flex w-full items-center gap-2.5 px-4 py-3 text-left">
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

/* ═══════════ Kartu statistik kecil ═══════════ */

function StatCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tabular-nums", accent ?? "text-foreground")}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ═══════════ Tab: Form keseluruhan ═══════════ */

interface FormTabProps {
  form: FormState;
  set: (k: keyof FormState, v: number) => void;
  childrenList: ChildDraft[];
  addChild: () => void;
  updChild: (id: number, p: Partial<ChildDraft>) => void;
  delChild: (id: number) => void;
  debtsList: DebtRow[];
  addDebt: () => void;
  delDebt: (id: number) => void;
  debtFormOpen: boolean;
  setDebtFormOpen: (v: boolean) => void;
  debtDraft: { party: string; amount: number; installmentCount: number; interestRate: number; monthlyInstallment: number; dueDate: string };
  setDebtDraft: React.Dispatch<React.SetStateAction<{ party: string; amount: number; installmentCount: number; interestRate: number; monthlyInstallment: number; dueDate: string }>>;
  saving: boolean;
  save: () => void;
  analyzing: boolean;
  analyze: () => void;
  analysis: FinancialAnalysis | null;
}

interface FormState {
  age: number;
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
  schoolInflation: number;
  dividendTarget: number;
  dividendYield: number;
}

function FormTab(p: FormTabProps) {
  const [open, setOpen] = React.useState<string | null>("profil");
  return (
    <div className="space-y-3">
      <SectionCard icon={Wallet} title="Profil & Cashflow" subtitle="Usia, pemasukan, pengeluaran, tabungan bulanan" open={open === "profil"} onToggle={() => setOpen(open === "profil" ? "" : "profil")}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Usia sekarang</label>
            <Input type="number" value={p.form.age || ""} onChange={(e) => p.set("age", Number(e.target.value) || 0)} className="h-9 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tabungan per bulan</label>
            <RupiahInput value={p.form.monthlySavings} onChange={(v) => p.set("monthlySavings", v)} className="h-9" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pemasukan bulanan</label>
          <RupiahInput value={p.form.monthlyIncome} onChange={(v) => p.set("monthlyIncome", v)} className="h-9" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pengeluaran bulanan</label>
          <RupiahInput value={p.form.monthlyExpense} onChange={(v) => p.set("monthlyExpense", v)} className="h-9" />
        </div>
      </SectionCard>

      <SectionCard icon={Users} title="Anak & Dana Pendidikan" subtitle="Daftar anak (bisa banyak) + biaya pendidikan target" open={open === "anak"} onToggle={() => setOpen(open === "anak" ? "" : "anak")}>
        <div className="space-y-2.5">
          {p.childrenList.length === 0 && (
            <p className="rounded-lg border border-dashed border-border/70 p-3 text-center text-[11px] text-muted-foreground">
              Belum ada anak — tambahkan untuk hitung dana pendidikan.
            </p>
          )}
          {p.childrenList.map((c, i) => (
            <div key={c.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
                <Input value={c.name} onChange={(e) => p.updChild(c.id, { name: e.target.value })} className="h-8 flex-1 text-sm" />
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => p.delChild(c.id)} aria-label="Hapus anak">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Usia</label>
                  <Input type="number" value={c.age || ""} onChange={(e) => p.updChild(c.id, { age: Number(e.target.value) || 0 })} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Jenjang target</label>
                  <select value={c.schoolLevel} onChange={(e) => p.updChild(c.id, { schoolLevel: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-2">
                <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Biaya pendidikan per tahun (sekarang)</label>
                <RupiahInput value={c.schoolCostYear} onChange={(v) => p.updChild(c.id, { schoolCostYear: v })} className="h-8" />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={p.addChild}>
            <Plus className="size-3.5" /> Tambah anak
          </Button>
        </div>
      </SectionCard>

      <SectionCard icon={Landmark} title="Cicilan & Hutang" subtitle="Beban cicilan multiple — dianalisa AI urutan pelunasan" open={open === "cicilan"} onToggle={() => setOpen(open === "cicilan" ? "" : "cicilan")}>
        <div className="space-y-2">
          {p.debtsList.length === 0 && (
            <p className="rounded-lg border border-dashed border-border/70 p-3 text-center text-[11px] text-muted-foreground">Belum ada cicilan tercatat.</p>
          )}
          {p.debtsList.map((d) => {
            const sisa = Math.max(0, d.amount - d.paidAmount);
            return (
              <div key={d.id} className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold">{d.party}</p>
                  <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive" onClick={() => p.delDebt(d.id)} aria-label="Hapus cicilan">
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

          <div className="overflow-hidden rounded-lg border border-primary/20 bg-primary/[0.04]">
            <button onClick={() => p.setDebtFormOpen(!p.debtFormOpen)} className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-semibold text-primary">
              <Plus className={cn("size-3.5 transition-transform", p.debtFormOpen && "rotate-45")} />
              {p.debtFormOpen ? "Tutup form cicilan" : "Tambah cicilan"}
            </button>
            {p.debtFormOpen && (
              <div className="space-y-2 border-t border-border/40 p-3">
                <Input value={p.debtDraft.party} onChange={(e) => p.setDebtDraft((s) => ({ ...s, party: e.target.value }))} placeholder="Nama cicilan (mis. KPR, kredit motor)" className="h-8 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Sisa pokok</label>
                    <RupiahInput value={p.debtDraft.amount} onChange={(v) => p.setDebtDraft((s) => ({ ...s, amount: v }))} className="h-8" />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Tenor (x cicilan)</label>
                    <Input type="number" value={p.debtDraft.installmentCount || ""} onChange={(e) => p.setDebtDraft((s) => ({ ...s, installmentCount: Number(e.target.value) || 1 }))} className="h-8 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Angsuran/bulan</label>
                    <RupiahInput value={p.debtDraft.monthlyInstallment} onChange={(v) => p.setDebtDraft((s) => ({ ...s, monthlyInstallment: v }))} className="h-8" />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Bunga %/thn</label>
                    <Input type="number" value={p.debtDraft.interestRate || ""} onChange={(e) => p.setDebtDraft((s) => ({ ...s, interestRate: Number(e.target.value) || 0 }))} className="h-8 text-sm" placeholder="0 = tanpa bunga" />
                  </div>
                </div>
                <Input type="date" value={p.debtDraft.dueDate} onChange={(e) => p.setDebtDraft((s) => ({ ...s, dueDate: e.target.value }))} className="h-8 text-sm" />
                <Button size="sm" className="h-8 w-full gap-1 text-xs" onClick={p.addDebt}>
                  <Landmark className="size-3.5" /> Simpan cicilan
                </Button>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={TrendingUp} title="Investasi & Target" subtitle="Alokasi, return, FIRE, darurat & target dividen" open={open === "investasi"} onToggle={() => setOpen(open === "investasi" ? "" : "investasi")}>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Alokasi investasi (Saham {p.form.stockPct}% · Obligasi {p.form.bondPct}% · Kas {p.form.cashPct}%)
          </label>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-primary/80" style={{ width: `${p.form.stockPct}%` }} />
            <div className="bg-sky-500/70" style={{ width: `${p.form.bondPct}%` }} />
            <div className="bg-amber-500/70" style={{ width: `${p.form.cashPct}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                ["Saham %", "stockPct"],
                ["Obligasi %", "bondPct"],
                ["Kas %", "cashPct"],
              ] as const
            ).map(([label, key]) => (
              <div key={key}>
                <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">{label}</label>
                <Input type="number" value={p.form[key] || ""} onChange={(e) => p.set(key, Number(e.target.value) || 0)} className="h-8 text-sm" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Return saham %</label>
            <Input type="number" value={p.form.stockReturn || ""} onChange={(e) => p.set("stockReturn", Number(e.target.value) || 0)} className="h-8 text-sm" />
          </div>
          <div>
            <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Inflasi %</label>
            <Input type="number" value={p.form.inflation || ""} onChange={(e) => p.set("inflation", Number(e.target.value) || 0)} className="h-8 text-sm" />
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldAlert className="size-3" /> Dana darurat
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Terkumpul</label>
              <RupiahInput value={p.form.emergencyCurrent} onChange={(v) => p.set("emergencyCurrent", v)} className="h-8" />
            </div>
            <div>
              <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Target (x pengeluaran)</label>
              <Input type="number" value={p.form.emergencyMonths || ""} onChange={(e) => p.set("emergencyMonths", Number(e.target.value) || 6)} className="h-8 text-sm" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            <CircleDollarSign className="size-3" /> Target FIRE
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Pengali FIRE</label>
              <Input type="number" value={p.form.fireMultiple || ""} onChange={(e) => p.set("fireMultiple", Number(e.target.value) || 25)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Inflasi pendidikan %</label>
              <Input type="number" value={p.form.schoolInflation || ""} onChange={(e) => p.set("schoolInflation", Number(e.target.value) || 10)} className="h-8 text-sm" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-2.5">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="size-3" /> Target dividen pasif
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Dividen target / tahun</label>
              <RupiahInput value={p.form.dividendTarget} onChange={(v) => p.set("dividendTarget", v)} className="h-8" />
            </div>
            <div>
              <label className="mb-0.5 block text-[9px] font-semibold uppercase text-muted-foreground">Yield dividen %</label>
              <Input type="number" value={p.form.dividendYield || ""} onChange={(e) => p.set("dividendYield", Number(e.target.value) || 5)} className="h-8 text-sm" />
            </div>
          </div>
          {p.form.dividendTarget > 0 && (
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Butuh modal <b className="text-emerald-600 dark:text-emerald-400">{fmtRp(Math.round(p.form.dividendTarget / (p.form.dividendYield / 100)))}</b> untuk dividen {fmtRp(p.form.dividendTarget)}/tahun
            </p>
          )}
        </div>
      </SectionCard>

      <div className="flex items-center gap-2">
        <Button onClick={p.save} disabled={p.saving} className="h-10 gap-1.5 px-5">
          {p.saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Simpan profil
        </Button>
        <Button variant="outline" className="h-10 gap-1.5 px-5" onClick={p.analyze} disabled={p.analyzing}>
          {p.analyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {p.analysis ? "Analisa ulang" : "Analisa AI"}
        </Button>
      </div>
    </div>
  );
}

/* ═══════════ Tab: FIRE Advisor ═══════════ */

function FireTab({ form, liveResult }: { form: FormState; liveResult: ReturnType<typeof computePlan> }) {
  const [targetAge, setTargetAge] = React.useState(() => (form.age > 0 ? Math.min(60, form.age + 10) : 60));
  const annualExpense = form.monthlyExpense * 12;
  const fireTarget = form.fireMultiple * annualExpense;
  const surplus = form.monthlyIncome - form.monthlyExpense;

  // Brute force: cari tabungan/bulan minimal agar FIRE tercapai di targetAge
  const needPerMonth = React.useMemo(() => {
    if (!form.age || targetAge <= form.age) return null;
    for (let s = 100000; s <= 50000000; s += 100000) {
      const base = {
        ...form,
        childrenCount: 0,
        childAge: 0,
        schoolLevel: "kuliah" as const,
        schoolCostYear: 0,
        monthlySavings: s,
      };
      const r = computePlan(base as never);
      if (r.fireAge !== null && r.fireAge <= targetAge) return s;
    }
    return null;
  }, [form, targetAge]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/8 via-card to-card p-4 shadow-sm">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <CircleDollarSign className="size-4 text-primary" /> Kapan kamu bisa Financial Independent?
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Dengan tabungan saat ini {fmtRp(form.monthlySavings)}/bulan, kamu akan mencapai FIRE dalam{" "}
          <b className="text-primary">{liveResult.yearsToFire ?? "—"} tahun</b> (usia <b>{liveResult.fireAge ?? "—"}</b>).
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold">Target usia pensiun</label>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">{targetAge} th</span>
        </div>
        <input
          type="range"
          min={form.age + 1}
          max={70}
          step={1}
          value={targetAge}
          onChange={(e) => setTargetAge(Number(e.target.value))}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        />
        <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground">
          <span>{form.age + 1}</span>
          <span>70</span>
        </div>
        {needPerMonth ? (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
            <p className="text-[10px] text-muted-foreground">
              Untuk FIRE di usia <b className="text-foreground">{targetAge}</b>, kamu perlu menabung minimal:
            </p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmtRp(needPerMonth)}/bulan</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {needPerMonth <= surplus ? (
                <>Bisa! Surplus bulananmu {fmtRp(surplus)} cukup untuk ini ✅</>
              ) : (
                <>Butuh tambahan {fmtRp(needPerMonth - surplus)}/bulan — cek tab FIRE target yang lebih tinggi, kurangi pengeluaran, atau naikkan pemasukan.</>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 text-[11px] text-amber-600 dark:text-amber-400">
            Target usia terlalu dekat dengan usia sekarang — pilih usia yang lebih realistis.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Target FIRE" value={fmtRp(fireTarget)} hint={`${form.fireMultiple}x pengeluaran tahunan`} />
        <StatCard label="Surplus bulanan" value={fmtRp(surplus)} hint="Pemasukan − pengeluaran" accent="text-emerald-600 dark:text-emerald-400" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <p className="text-xs font-semibold">💡 Saran tabungan & investasi</p>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <li>• Idealnya tabung <b className="text-foreground">minimal 20-30% dari pemasukan</b> — kamu sekarang {form.monthlyIncome > 0 ? Math.round((form.monthlySavings / form.monthlyIncome) * 100) : 0}%.</li>
          <li>• Dari surplus {fmtRp(surplus)}, alokasikan {fmtRp(Math.round(surplus * 0.6))} untuk investasi & {fmtRp(Math.round(surplus * 0.4))} untuk tabungan darurat.</li>
          <li>• Prinsip Ray Dalio: hidup di bawah kemampuan — kalau kebutuhan tetap terkendali, FIRE datang lebih cepat.</li>
        </ul>
      </div>
    </div>
  );
}

/* ═══════════ Tab: Dana Darurat ═══════════ */

function EmergencyTab({ form }: { form: FormState }) {
  const target = form.monthlyExpense * form.emergencyMonths;
  const gap = Math.max(0, target - form.emergencyCurrent);
  const pct = target > 0 ? Math.min(100, Math.round((form.emergencyCurrent / target) * 100)) : 100;
  const monthsToReach = form.monthlySavings > 0 ? Math.ceil(gap / form.monthlySavings) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Target darurat" value={fmtRp(target)} hint={`${form.emergencyMonths}x pengeluaran bulanan`} />
        <StatCard label="Terkumpul" value={fmtRp(form.emergencyCurrent)} accent={form.emergencyCurrent >= target ? "text-emerald-600 dark:text-emerald-400" : ""} />
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">Progress</span>
          <span className="tabular-nums font-bold text-primary">{pct}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", form.emergencyCurrent >= target ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
        </div>
        {gap > 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Masih kurang <b className="text-amber-600 dark:text-amber-400">{fmtRp(gap)}</b>
            {monthsToReach !== null && form.monthlySavings > 0 && (
              <> — dengan tabungan {fmtRp(form.monthlySavings)}/bulan, tercapai ±<b>{monthsToReach} bulan</b></>
            )}
            .
          </p>
        ) : (
          <p className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Dana darurat tercapai! 🎉 Sisihkan surplus untuk investasi.</p>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <p className="text-xs font-semibold">📌 Rekomendasi</p>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <li>• Prinsip umum: darurat = <b className="text-foreground">3-6x pengeluaran bulanan</b> (semakin besar tanggungan, semakin tinggi).</li>
          <li>• Simpan di instrumen likuid tanpa riba (tabungan syariah / reksa dana pasar uang syariah) — bukan saham.</li>
          <li>• Prioritas: darurat penuh <b className="text-foreground">sebelum</b> investasi agresif — ini benteng pertamamu.</li>
        </ul>
      </div>
    </div>
  );
}

/* ═══════════ Tab: Dana Pendidikan ═══════════ */

function EducationTab({ form, childrenList }: { form: FormState; childrenList: ChildDraft[] }) {
  const rows = childrenList.map((c) => {
    const masuk = LEVEL_AGE[c.schoolLevel] ?? 19;
    const tahunLagi = Math.max(0, masuk - c.age);
    const biayaFuture = c.schoolCostYear > 0 ? Math.round(c.schoolCostYear * Math.pow(1 + form.schoolInflation / 100, tahunLagi)) : 0;
    const perBulan = tahunLagi > 0 && biayaFuture > 0 ? Math.ceil(biayaFuture / (tahunLagi * 12)) : biayaFuture;
    return { ...c, masuk, tahunLagi, biayaFuture, perBulan };
  });
  const totalBulanan = rows.reduce((a, r) => a + r.perBulan, 0);

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
          Tambahkan anak di tab <b>Form</b> untuk menghitung dana pendidikan 👶
        </p>
      ) : (
        <>
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <GraduationCap className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Usia {r.age} → {r.schoolLevel.toUpperCase()} (masuk ±{r.masuk} th) · {r.tahunLagi} tahun lagi
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{r.tahunLagi} thn</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-[9px] font-semibold uppercase text-muted-foreground">Biaya saat masuk (dengan inflasi {form.schoolInflation}%)</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums">{fmtRp(r.biayaFuture)}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 p-2.5">
                  <p className="text-[9px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Perlu ditabung per bulan</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtRp(r.perBulan)}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Total dana pendidikan per bulan</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmtRp(totalBulanan)}</p>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Dibanding tabungan {fmtRp(form.monthlySavings)}/bulan — {totalBulanan <= form.monthlySavings ? "cukup ✅" : `butuh tambahan ${fmtRp(totalBulanan - form.monthlySavings)}/bulan ⚠️`}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════ Panel: Rencana vs Aktual (perbandingan detail) ═══════════ */

interface CompareData {
  bulan: string;
  rencana: { income: number; expense: number; savings: number; emergencyCurrent: number; emergencyTarget: number; fireMultiple: number };
  aktual: { income: number; expense: number; sisa: number; proyeksiAkhir: number; dayOfMonth: number };
  perbandingan: {
    incomeSelisih: number;
    incomePct: number;
    expenseSelisih: number;
    expensePct: number;
    savingsAktual: number;
    savingsPct: number;
    boros: boolean;
    proyeksiBoros: boolean;
  };
  budget: { kategori: string; limit: number; aktual: number; pct: number; status: "belum" | "melampaui" | "hampir" | "aman" }[];
  topKategori: { rank: number; nama: string; total: number; pctOfTotal: number }[];
  subscriptionTotal: number;
  alokasi: { idealNeed: number; idealSave: number; aktualNeedPct: number; status: string };
  darurat: { target: number; current: number; bisaTambah: number };
}

function CompareCard({ label, rencana, aktual, pct, selisih, warn }: { label: string; rencana: string; aktual: string; pct: number; selisih: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="text-base font-bold tabular-nums">{aktual}</span>
        <span className={cn("text-[10px] font-semibold tabular-nums", warn ? "text-rose-600 dark:text-rose-400" : pct >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
          {pct}% dari rencana
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", warn ? "bg-rose-500" : "bg-primary")} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
        <span>Rencana {rencana}</span>
        <span>{selisih}</span>
      </div>
    </div>
  );
}

function ComparePanel() {
  const [data, setData] = React.useState<CompareData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/financial-plan/compare")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setData(j.data ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Menghitung perbandingan rencana vs aktual…
      </div>
    );
  }
  if (!data) return null;

  const p = data.perbandingan;
  const fmt = (n: number) => fmtRp(n);
  const sign = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <TrendingUp className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Rencana vs Aktual — {data.bulan}</p>
          <p className="text-[10px] text-muted-foreground">Perbandingan detail form vs transaksi Finance · hari ke-{data.aktual.dayOfMonth}</p>
        </div>
      </div>

      {/* Kartu utama */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CompareCard
          label="💵 Pemasukan"
          rencana={fmt(data.rencana.income)}
          aktual={fmt(data.aktual.income)}
          pct={p.incomePct}
          selisih={p.incomeSelisih >= 0 ? `${sign(p.incomeSelisih)} ✅` : `${sign(p.incomeSelisih)} ⚠️`}
          warn={p.incomeSelisih < 0}
        />
        <CompareCard
          label="💸 Pengeluaran"
          rencana={fmt(data.rencana.expense)}
          aktual={fmt(data.aktual.expense)}
          pct={p.expensePct}
          selisih={p.boros ? `${sign(p.expenseSelisih)} ⚠️ boros` : `${sign(p.expenseSelisih)} hemat`}
          warn={p.boros}
        />
      </div>

      {/* Proyeksi akhir bulan + tabungan + darurat */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className={cn("rounded-xl border p-3.5 shadow-sm", p.proyeksiBoros ? "border-rose-500/30 bg-rose-500/[0.06]" : "border-emerald-500/30 bg-emerald-500/[0.06]")}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">🔮 Proyeksi akhir bulan</p>
          <p className={cn("mt-1 text-base font-bold tabular-nums", p.proyeksiBoros ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
            {fmt(data.aktual.proyeksiAkhir)}
          </p>
          <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
            {p.proyeksiBoros
              ? `Melebihi rencana ${fmt(data.rencana.expense)} — perketat pengeluaran!`
              : `Masih di bawah rencana ${fmt(data.rencana.expense)} ✅`}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">🏦 Tabungan aktual</p>
          <p className={cn("mt-1 text-base font-bold tabular-nums", p.savingsPct >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
            {fmt(p.savingsAktual)}
          </p>
          <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
            {p.savingsPct >= 100 ? `Memenuhi target ${fmt(data.rencana.savings)} ✅` : `${p.savingsPct}% dari target ${fmt(data.rencana.savings)}`}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">🛡️ Dana darurat</p>
          <p className="mt-1 text-base font-bold tabular-nums">{fmt(data.darurat.current)}</p>
          <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
            Target {fmt(data.darurat.target)} · sisa bulan ini bisa tambah {fmt(data.darurat.bisaTambah)}
          </p>
        </div>
      </div>

      {/* Budget per kategori */}
      {data.budget.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">🎯 Budget per kategori vs aktual</p>
          <div className="mt-2 space-y-2">
            {data.budget.map((b) => (
              <div key={b.kategori}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-medium">{b.kategori}</span>
                  <span className={cn("tabular-nums font-semibold", b.status === "melampaui" ? "text-rose-600 dark:text-rose-400" : b.status === "hampir" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                    {fmt(b.aktual)} / {fmt(b.limit)}
                    {b.status === "melampaui" && " ⚠️ melampaui!"}
                    {b.status === "hampir" && " ⚠️ hampir penuh"}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", b.status === "melampaui" ? "bg-rose-500" : b.status === "hampir" ? "bg-amber-500" : "bg-primary")}
                    style={{ width: `${Math.min(100, b.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top kategori + langganan + 50/30/20 */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        {data.topKategori.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">🏆 Top kategori pengeluaran</p>
            <div className="mt-2 space-y-1.5">
              {data.topKategori.map((k) => (
                <div key={k.rank} className="flex items-center gap-2 text-[10px]">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[8px] font-bold text-primary">{k.rank}</span>
                  <span className="min-w-0 flex-1 truncate">{k.nama}</span>
                  <span className="tabular-nums font-semibold">{fmt(k.total)}</span>
                  <span className="w-8 text-right tabular-nums text-muted-foreground">{k.pctOfTotal}%</span>
                </div>
              ))}
              {data.topKategori[0] && (
                <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground">
                  💡 <b>{data.topKategori[0].nama}</b> menyumbang {data.topKategori[0].pctOfTotal}% pengeluaran — kandidat utama pemangkasan.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">🔄 Langganan aktif</p>
          <p className="mt-1 text-base font-bold tabular-nums">{fmt(data.subscriptionTotal)}/bln</p>
          <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
            {data.rencana.expense > 0 ? `${Math.round((data.subscriptionTotal / Math.max(1, data.rencana.expense)) * 100)}% dari rencana pengeluaran` : "Biaya tetap bulanan"}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">⚖️ Alokasi 50/30/20</p>
          <div className="mt-1.5 space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kebutuhan aktual</span>
              <span className={cn("font-semibold tabular-nums", data.alokasi.aktualNeedPct > 50 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                {data.alokasi.aktualNeedPct}% (ideal 50%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ideal tabung+investasi</span>
              <span className="font-semibold tabular-nums">{fmt(data.alokasi.idealSave)}/bln</span>
            </div>
            <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
              {data.alokasi.aktualNeedPct > 50
                ? "Kebutuhan melebihi 50% pemasukan — tinjau ulang pengeluaran non-esensial."
                : data.alokasi.aktualNeedPct < 30
                  ? "Kebutuhan rendah — peluang besar untuk investasi. 🚀"
                  : "Keseimbangan sehat — pertahankan! ✅"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ Tab: Insight keseluruhan ═══════════ */

function InsightTab({
  analysis,
  analyzing,
  analyze,
}: {
  analysis: FinancialAnalysis | null;
  analyzing: boolean;
  analyze: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Insight AI */}
      <div className="overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Insight keseluruhan</p>
            <p className="text-[10px] text-muted-foreground">Prioritas lunas · alokasi % · roadmap</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={analyze} disabled={analyzing}>
            {analyzing ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            {analysis ? "Analisa ulang" : "Analisa AI"}
          </Button>
        </div>

        {!analysis ? (
          <div className="space-y-2 p-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Simpan profil di tab <b>Form</b>, lalu klik <b>Analisa AI</b> — AI menyusun prioritas pelunasan cicilan, alokasi dana, dan roadmap menuju dividen pasif.
            </p>
            <p className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5 text-[10px] text-muted-foreground">
              <ShieldAlert className="size-3.5 shrink-0 text-primary" />
              Analisa anti-riba: cicilan diurutkan dari sisa kecil & tenor pendek — tanpa saran bunga.
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            <p className="rounded-lg border border-border/50 bg-muted/20 p-2.5 text-[11px] leading-relaxed">{analysis.ringkasan}</p>

            {analysis.statusBoros?.boros && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.07] p-2.5">
                <p className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="size-3" /> Terdeteksi boros bulan ini
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-foreground/85">{analysis.statusBoros.pesan}</p>
              </div>
            )}

            {analysis.alokasiPersen && (
              <div>
                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">💹 Alokasi pemasukan yang disarankan</p>
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

            {analysis.insightTokoh && analysis.insightTokoh.length > 0 && (
              <div>
                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">🧠 Insight para investor legendaris</p>
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

            {analysis.prioritasLunas.length > 0 && (
              <div>
                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">🏆 Urutan lunasi cicilan</p>
                <ol className="space-y-1.5">
                  {analysis.prioritasLunas.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 p-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">{i + 1}</span>
                      <span className="text-[10px] leading-relaxed">
                        <b>{p.nama}</b> — {p.alasan}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

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

    </div>
  );
}


/* ═══════════ Tab: Chat AI ═══════════ */

function ChatTab() {
  const [chats, setChats] = React.useState<ChatRow[]>([]);
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const chatBoxRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/financial-plan/chat")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setChats(j.data ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: "smooth" });
  }, [chats, sending]);

  const send = async () => {
    const m = message.trim();
    if (!m || sending) return;
    setMessage("");
    setSending(true);
    setChats((prev) => [...prev, { id: Date.now(), role: "user", message: m, createdAt: "" }]);
    try {
      const res = await fetch("/api/financial-plan/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: m }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      setChats((prev) => [...prev, { id: Date.now() + 1, role: "assistant", message: json.data.message, createdAt: "" }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menjawab");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex h-[calc(100dvh-300px)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageSquareText className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Tanya financial advisor AI</p>
            <p className="text-[10px] text-muted-foreground">AI menjawab dengan konteks profil keuanganmu</p>
          </div>
        </div>

        <div ref={chatBoxRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {chats.length === 0 && !sending && (
            <div className="space-y-1.5 rounded-lg bg-muted/30 p-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                👋 Tanya apa saja, misalnya: <i>&quot;Berapa idealnya aku menabung per bulan?&quot;</i>, <i>&quot;Apakah aku boros bulan ini?&quot;</i>, atau <i>&quot;Kapan aku bisa pensiun?&quot;</i>
              </p>
            </div>
          )}
          {chats.map((c) => (
            <div key={c.id} className={cn("flex", c.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed break-words [overflow-wrap:anywhere]",
                  c.role === "user" ? "rounded-br-sm bg-primary/15 text-foreground" : "rounded-bl-sm bg-muted/40 text-foreground/85"
                )}
              >
                {c.role === "assistant" ? (
                  <div className="markdown-chat">
                    <ReactMarkdown
                      components={{
                        strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                        em: ({ children }) => <em>{children}</em>,
                        p: ({ children }) => <p className="my-0.5">{children}</p>,
                        ul: ({ children }) => <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>,
                        ol: ({ children }) => <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        h1: ({ children }) => <p className="my-1 text-xs font-bold">{children}</p>,
                        h2: ({ children }) => <p className="my-1 text-xs font-bold">{children}</p>,
                        h3: ({ children }) => <p className="my-1 text-[11px] font-bold">{children}</p>,
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
                            {children}
                          </a>
                        ),
                        code: ({ children }) => (
                          <code className="rounded bg-muted-foreground/10 px-1 py-0.5 font-mono text-[10px]">{children}</code>
                        ),
                      }}
                    >
                      {c.message}
                    </ReactMarkdown>
                  </div>
                ) : (
                  c.message
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> AI sedang berpikir…
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-end gap-2 border-t border-border/40 p-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Tanya AI financial advisor…"
            rows={2}
            className="min-h-[44px] flex-1 resize-none rounded-lg border border-input bg-background p-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
          <Button size="icon" className="size-10 shrink-0" onClick={() => void send()} disabled={sending || !message.trim()} aria-label="Kirim">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ Workspace utama ═══════════ */

export function FinancialPlanWorkspace() {
  const [tab, setTab] = React.useState<TabId>("form");
  const [form, setForm] = React.useState<FormState>({
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
  const [actualExpense, setActualExpense] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [debtFormOpen, setDebtFormOpen] = React.useState(false);
  const [debtDraft, setDebtDraft] = React.useState({ party: "", amount: 0, installmentCount: 1, interestRate: 0, monthlyInstallment: 0, dueDate: "" });
  const childIdRef = React.useRef(1);

  const set = (key: keyof FormState, val: number) => setForm((prev) => ({ ...prev, [key]: val }));

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
    fetch("/api/finance/summary")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.data) {
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

  /* ── Cicilan ── */
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
          Financial advisor pribadimu — profil, FIRE, dana darurat, pendidikan & insight AI dalam satu tempat.
        </p>
      </header>

      {/* Alert boros global */}
      {actualExpense > form.monthlyExpense * 1.05 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.07] p-3.5 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <ShieldAlert className="size-3.5" /> ⚠️ Kamu boros bulan ini!
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-foreground/85">
            Pengeluaran aktual <b>{fmtRp(actualExpense)}</b> melebihi rencana <b>{fmtRp(form.monthlyExpense)}</b> (+{fmtRp(actualExpense - form.monthlyExpense)}).
            Cek detail di fitur Finance.
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, Math.round((actualExpense / Math.max(1, form.monthlyExpense)) * 100))}%` }} />
          </div>
        </div>
      )}

      {/* ── Tab ── */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors",
              tab === t.id ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Konten tab ── */}
      {tab === "form" && (
        <>
          <FormTab
            form={form}
            set={set}
            childrenList={children}
            addChild={addChild}
            updChild={updChild}
            delChild={delChild}
            debtsList={debtsList}
            addDebt={() => void addDebt()}
            delDebt={(id) => void delDebt(id)}
            debtFormOpen={debtFormOpen}
            setDebtFormOpen={setDebtFormOpen}
            debtDraft={debtDraft}
            setDebtDraft={setDebtDraft}
            saving={saving}
            save={() => void save()}
            analyzing={analyzing}
            analyze={() => void analyze()}
            analysis={analysis}
          />
          {/* Panel perbandingan Rencana vs Aktual */}
          <div className="border-t border-border/40 pt-4">
            <ComparePanel />
          </div>
        </>
      )}
      {tab === "fire" && <FireTab form={form} liveResult={liveResult} />}
      {tab === "darurat" && <EmergencyTab form={form} />}
      {tab === "pendidikan" && <EducationTab form={form} childrenList={children} />}
      {tab === "insight" && <InsightTab analysis={analysis} analyzing={analyzing} analyze={() => void analyze()} />}
      {tab === "chat" && <ChatTab />}
    </div>
  );
}
