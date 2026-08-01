"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  ArrowLeftRight,
  CheckCircle2,
  HandCoins,
  Loader2,
  PencilLine,
  Plus,
  Repeat,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RupiahInput } from "@/components/ui/rupiah-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface DebtItem {
  id: number;
  type: "hutang" | "piutang";
  party: string;
  amount: number;
  paymentMode: "sekali" | "cicilan";
  installmentCount: number;
  installmentsPaid: number;
  paidAmount: number;
  date: string;
  dueDate: string;
  status: "belum" | "sebagian" | "lunas";
  notes: string;
  remaining: number;
  progressPct: number;
}

interface Summary {
  totalHutang: number;
  totalPiutang: number;
  aktifHutang: number;
  aktifPiutang: number;
  lunasCount: number;
  selisih: number;
}

function fmtRp(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

const STATUS_META = {
  belum: { label: "Belum", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  sebagian: { label: "Sebagian", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  lunas: { label: "Lunas", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
} as const;

/** Halaman Hutang & Piutang — 2 arah, mode sekali/cicilan, status, jatuh tempo. */
export function DebtsWorkspace() {
  const [items, setItems] = React.useState<DebtItem[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [filterType, setFilterType] = React.useState<"semua" | "hutang" | "piutang">("semua");
  const [filterStatus, setFilterStatus] = React.useState<"semua" | "belum" | "sebagian" | "lunas">("semua");
  const [deleteTarget, setDeleteTarget] = React.useState<DebtItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [editing, setEditing] = React.useState<DebtItem | null>(null);

  // Form
  const [formOpen, setFormOpen] = React.useState(false);
  const [formType, setFormType] = React.useState<"hutang" | "piutang">("hutang");
  const [party, setParty] = React.useState("");
  const [amount, setAmount] = React.useState(0);
  const [paymentMode, setPaymentMode] = React.useState<"sekali" | "cicilan">("sekali");
  const [installmentCount, setInstallmentCount] = React.useState(12);
  const [installmentsPaid, setInstallmentsPaid] = React.useState(0);
  /** Nominal per cicilan (anti riba — tanpa bunga, total = per × jumlah) */
  const [installmentAmount, setInstallmentAmount] = React.useState(0);
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Nilai bayar cepat (tombol "Bayar sebagian/lunas")
  const [quickPay, setQuickPay] = React.useState<{ item: DebtItem; amount: number } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/debts");
        const json = await res.json();
        if (cancelled) return;
        setItems(json.data ?? []);
        setSummary(json.summary ?? null);
      } catch {
        // biarkan kosong
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const filtered = items.filter(
    (d) =>
      (filterType === "semua" || d.type === filterType) &&
      (filterStatus === "semua" || d.status === filterStatus)
  );

  const resetForm = () => {
    setFormType("hutang");
    setParty("");
    setAmount(0);
    setPaymentMode("sekali");
    setInstallmentCount(12);
    setInstallmentsPaid(0);
    setInstallmentAmount(0);
    setDate(new Date().toISOString().slice(0, 10));
    setDueDate("");
    setNotes("");
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (d: DebtItem) => {
    setEditing(d);
    setFormType(d.type);
    setParty(d.party);
    setAmount(d.amount);
    setPaymentMode(d.paymentMode);
    setInstallmentCount(d.installmentCount);
    setInstallmentsPaid(d.installmentsPaid);
    setInstallmentAmount(
      d.paymentMode === "cicilan" && d.installmentCount > 0
        ? Math.round(d.amount / d.installmentCount)
        : 0
    );
    setDate(d.date);
    setDueDate(d.dueDate);
    setNotes(d.notes);
    setFormOpen(true);
  };

  const save = async () => {
    const p = party.trim();
    if (!p) {
      toast.error("Isi nama pihak dulu");
      return;
    }
    if (effectiveAmount <= 0) {
      toast.error(paymentMode === "cicilan" ? "Isi nominal per cicilan dulu" : "Isi nominal dulu");
      return;
    }
    setSaving(true);
    try {
      const body = {
        id: editing?.id,
        type: formType,
        party: p,
        amount: effectiveAmount,
        paymentMode,
        installmentCount,
        installmentsPaid,
        paidAmount: editing?.paidAmount ?? 0,
        date,
        dueDate,
        notes,
      };
      const res = await fetch("/api/debts", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success(editing ? "Data diperbarui ✏️" : "Data ditambahkan 💾");
      setFormOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  /** Bayar / terima sebagian — tambah ke paidAmount. */
  const pay = async () => {
    if (!quickPay) return;
    const { item, amount: payAmt } = quickPay;
    if (payAmt <= 0) {
      toast.error("Isi nominal bayar");
      return;
    }
    setSaving(true);
    try {
      const newPaid = Math.min(item.amount, item.paidAmount + payAmt);
      const newInstallmentsPaid =
        item.paymentMode === "cicilan"
          ? Math.min(item.installmentCount, item.installmentsPaid + 1)
          : item.installmentsPaid;
      const res = await fetch("/api/debts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          paidAmount: newPaid,
          installmentsPaid: newInstallmentsPaid,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(item.type === "hutang" ? "Pembayaran dicatat 💸" : "Penerimaan dicatat 💰");
      setQuickPay(null);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Gagal mencatat pembayaran");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: DebtItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/debts/${d.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Data dihapus");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  // Anti riba: total otomatis = nominal per cicilan × jumlah cicilan (tanpa bunga)
  const computedTotal =
    paymentMode === "cicilan" && installmentCount > 0 ? installmentAmount * installmentCount : amount;
  const effectiveAmount = paymentMode === "cicilan" ? computedTotal : amount;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ArrowLeftRight className="size-6 text-primary" /> Hutang & Piutang
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catat utang-piutang dengan pihak lain — sekali bayar atau cicilan, status & jatuh tempo.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Loader2 className="size-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat…</p>
        </div>
      ) : (
        <>
          {/* ── Ringkasan ── */}
          <div className="grid grid-cols-1 grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Wallet className="size-3 text-rose-500" /> Hutang aktif
              </p>
              <p className="mt-1 text-lg font-bold leading-none text-rose-500">
                {fmtRp(summary?.aktifHutang ?? 0)}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                total {fmtRp(summary?.totalHutang ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="size-3 text-emerald-500" /> Piutang aktif
              </p>
              <p className="mt-1 text-lg font-bold leading-none text-emerald-500">
                {fmtRp(summary?.aktifPiutang ?? 0)}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                total {fmtRp(summary?.totalPiutang ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                <HandCoins className="size-3 text-primary" /> Selisih
              </p>
              <p
                className={cn(
                  "mt-1 text-lg font-bold leading-none",
                  (summary?.selisih ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                )}
              >
                {fmtRp(Math.abs(summary?.selisih ?? 0))}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {(summary?.selisih ?? 0) >= 0 ? "kita lebih banyak menerima" : "kita lebih banyak berutang"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                <CheckCircle2 className="size-3 text-emerald-500" /> Lunas
              </p>
              <p className="mt-1 text-lg font-bold leading-none">{summary?.lunasCount ?? 0}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">dari {items.length} data</p>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as never)}>
              <SelectTrigger className="h-9 w-32 text-xs" aria-label="Filter jenis">
                <SelectValue placeholder="Semua" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua jenis</SelectItem>
                <SelectItem value="hutang">🔴 Hutang</SelectItem>
                <SelectItem value="piutang">🟢 Piutang</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as never)}>
              <SelectTrigger className="h-9 w-32 text-xs" aria-label="Filter status">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua status</SelectItem>
                <SelectItem value="belum">Belum</SelectItem>
                <SelectItem value="sebagian">Sebagian</SelectItem>
                <SelectItem value="lunas">Lunas</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="ml-auto h-9 gap-1.5 text-xs" onClick={openAdd}>
              <Plus className="size-3.5" /> Tambah data
            </Button>
          </div>

          {/* ── Daftar ── */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Belum ada data — tambahkan hutang/piutang pertama kamu. 💸
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filtered.map((d) => {
                const meta = STATUS_META[d.status];
                const isHutang = d.type === "hutang";
                const perCicilan =
                  d.paymentMode === "cicilan" && d.installmentCount > 0
                    ? Math.round(d.amount / d.installmentCount)
                    : 0;
                return (
                  <div
                    key={d.id}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-colors hover:shadow-md",
                      isHutang ? "border-rose-500/20 hover:border-rose-500/40" : "border-emerald-500/20 hover:border-emerald-500/40"
                    )}
                  >
                    {/* Header: tipe + status */}
                    <div className={cn("flex items-center justify-between gap-2 px-4 py-2", isHutang ? "bg-rose-500/[0.06]" : "bg-emerald-500/[0.06]")}>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold",
                          isHutang
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {isHutang ? "🔴 HUTANG" : "🟢 PIUTANG"}
                      </span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", meta.className)}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Isi */}
                    <div className="flex-1 px-4 py-3">
                      <p className="truncate text-sm font-semibold">{d.party}</p>
                      <p className="mt-0.5 space-y-0.5 text-[10px] leading-relaxed text-muted-foreground">
                        <span className="block">
                          📅 Mulai {format(new Date(d.date + "T00:00:00"), "d MMM yyyy", { locale: id })}
                        </span>
                        {d.dueDate && (
                          <span className="block">
                            ⏰ Jatuh tempo {format(new Date(d.dueDate + "T00:00:00"), "d MMM yyyy", { locale: id })}
                          </span>
                        )}
                      </p>

                      {/* Angka: total & sisa */}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
                          <p className="mt-0.5 text-sm font-bold tabular-nums">{fmtRp(d.amount)}</p>
                        </div>
                        <div className={cn("rounded-lg px-2.5 py-2", isHutang ? "bg-rose-500/10" : "bg-emerald-500/10")}>
                          <p className={cn("text-[9px] font-semibold uppercase tracking-wide", isHutang ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400")}>
                            Sisa
                          </p>
                          <p className="mt-0.5 text-sm font-bold tabular-nums">{fmtRp(d.remaining)}</p>
                        </div>
                      </div>

                      {/* Progress */}
                      {d.status !== "lunas" && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full", isHutang ? "bg-rose-500" : "bg-emerald-500")}
                              style={{ width: `${d.progressPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {d.progressPct}%
                          </span>
                        </div>
                      )}

                      {/* Detail mode */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        {d.paymentMode === "cicilan" ? (
                          <>
                            <span className="rounded-full bg-muted/60 px-1.5 py-0.5">
                              Cicilan {d.installmentsPaid}/{d.installmentCount}
                            </span>
                            <span className="rounded-full bg-muted/60 px-1.5 py-0.5 tabular-nums">
                              {fmtRp(perCicilan)}/bulan
                            </span>
                            <span className="rounded-full bg-muted/60 px-1.5 py-0.5 tabular-nums">
                              Dibayar {fmtRp(d.paidAmount)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="rounded-full bg-muted/60 px-1.5 py-0.5 tabular-nums">
                              Dibayar {fmtRp(d.paidAmount)}
                            </span>
                            {d.notes && (
                              <span className="rounded-full bg-muted/60 px-1.5 py-0.5">📝 {d.notes}</span>
                            )}
                          </>
                        )}
                        {d.paymentMode === "cicilan" && d.notes && (
                          <span className="rounded-full bg-muted/60 px-1.5 py-0.5">📝 {d.notes}</span>
                        )}
                      </div>
                    </div>

                    {/* Footer aksi */}
                    <div className="flex items-center gap-1.5 border-t border-border/50 bg-muted/20 px-3 py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-[11px]"
                        disabled={d.status === "lunas"}
                        onClick={() => setQuickPay({ item: d, amount: d.remaining })}
                      >
                        <HandCoins className="size-3.5" />
                        {isHutang ? "Bayar" : "Terima"}
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(d)} aria-label={`Edit ${d.party}`}>
                        <PencilLine className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(d)}
                        aria-label={`Hapus ${d.party}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Dialog form (tambah/edit) ── */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setFormOpen(false)}>
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">{editing ? "Edit data" : "Tambah hutang/piutang"}</p>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setFormOpen(false)} aria-label="Tutup">
                <Plus className="size-4 rotate-45" />
              </Button>
            </div>

            <div className="space-y-3">
              {/* Jenis */}
              <div>
                <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Jenis</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormType("hutang")}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                      formType === "hutang"
                        ? "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    🔴 Hutang (saya berutang)
                  </button>
                  <button
                    onClick={() => setFormType("piutang")}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                      formType === "piutang"
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    🟢 Piutang (orang berutang)
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Nama pihak</span>
                <Input value={party} onChange={(e) => setParty(e.target.value)} placeholder="mis. Budi, Bank BCA, Toko…" className="h-9 text-sm" />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                  {paymentMode === "cicilan" ? "Nominal per cicilan" : "Total nominal"}
                </span>
                {paymentMode === "cicilan" ? (
                  <RupiahInput value={installmentAmount} onChange={setInstallmentAmount} prefix />
                ) : (
                  <RupiahInput value={amount} onChange={setAmount} prefix />
                )}
              </label>

              {paymentMode === "cicilan" && (
                <div className="rounded-lg bg-primary/5 px-3 py-2 text-[11px] text-primary">
                  Total cicilan (anti riba, tanpa bunga):{" "}
                  <b>{fmtRp(computedTotal)}</b> = {fmtRp(installmentAmount)} × {installmentCount} cicilan
                </div>
              )}

              {/* Mode bayar */}
              <div>
                <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Mode pembayaran</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMode("sekali")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                      paymentMode === "sekali"
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <Wallet className="size-3.5" /> 1x bayar
                  </button>
                  <button
                    onClick={() => setPaymentMode("cicilan")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                      paymentMode === "cicilan"
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <Repeat className="size-3.5" /> Cicilan
                  </button>
                </div>
              </div>

              {paymentMode === "cicilan" && (
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-2.5">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Total cicilan</span>
                    <Input
                      type="number"
                      min={1}
                      value={installmentCount || ""}
                      onChange={(e) => setInstallmentCount(Number(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Cicilan dibayar</span>
                    <Input
                      type="number"
                      min={0}
                      max={installmentCount}
                      value={installmentsPaid || ""}
                      onChange={(e) => setInstallmentsPaid(Number(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </label>
                  <p className="col-span-2 text-[10px] text-muted-foreground">
                    {installmentsPaid > 0
                      ? `sudah ${installmentsPaid}x (${fmtRp(installmentAmount * installmentsPaid)}) · sisa ${fmtRp(
                          computedTotal - installmentAmount * installmentsPaid
                        )}`
                      : "belum ada pembayaran"}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Tanggal mulai</span>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Jatuh tempo</span>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-sm" />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Catatan (opsional)</span>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="mis. Pinjam untuk modal usaha" className="h-9 text-sm" />
              </label>

              <Button onClick={() => void save()} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {saving ? "Menyimpan…" : editing ? "Simpan perubahan" : "Tambah data"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog bayar/terima ── */}
      {quickPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setQuickPay(null)}>
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold">
              {quickPay.item.type === "hutang" ? "Bayar hutang" : "Terima piutang"} — {quickPay.item.party}
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Sisa {fmtRp(quickPay.item.remaining)} ·{" "}
              {quickPay.item.paymentMode === "cicilan"
                ? `cicilan ${quickPay.item.installmentsPaid}/${quickPay.item.installmentCount}`
                : "mode 1x bayar"}
            </p>
            <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Nominal</label>
            <RupiahInput
              value={quickPay.amount}
              onChange={(v) => setQuickPay({ ...quickPay, amount: v })}
              prefix
              className="mb-4"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setQuickPay(null)}>
                Batal
              </Button>
              <Button className="flex-1 gap-1.5" onClick={() => void pay()} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {quickPay.item.type === "hutang" ? "Bayar" : "Terima"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus data"
        description={`Hapus data ${deleteTarget?.party} (${deleteTarget ? fmtRp(deleteTarget.amount) : ""})?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
