"use client";

import * as React from "react";
import { ChevronDown, Coins, Loader2, Pencil, PieChart, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtNum, fmtRp, Label, NativeSelect, Stat, SummaryCard } from "@/components/portfolio/bonds-workspace";

export interface MutualFund {
  id: number;
  name: string;
  type: string;
  units: number;
  navPrice: number;
  investedAmount: number;
  status: string;
  notes: string;
}

const TYPE_LABEL: Record<string, string> = {
  pasar_uang: "Pasar Uang",
  pendapatan_tetap: "Pendapatan Tetap",
  saham: "Saham",
  campuran: "Campuran",
  indeks: "Indeks",
};

const TYPE_COLOR: Record<string, string> = {
  pasar_uang: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  pendapatan_tetap: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  saham: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  campuran: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  indeks: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const STATUS_LABEL: Record<string, string> = { aktif: "Aktif", dijual: "Dijual" };

const empty = { name: "", type: "pasar_uang", units: 0, navPrice: 0, investedAmount: 0, status: "aktif", notes: "" };

/** Tab Reksa Dana — portofolio reksa dana + nilai & P/L. */
export function MutualFundsWorkspace() {
  const [items, setItems] = React.useState<MutualFund[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const [delTarget, setDelTarget] = React.useState<MutualFund | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(() => {
    fetch("/api/mutual-funds")
      .then((r) => r.json())
      .then((j) => setItems(j.data ?? []))
      .catch(() => toast.error("Gagal memuat reksa dana"))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const totalInvested = items.reduce((a, b) => a + b.investedAmount, 0);
  const totalValue = items.reduce((a, b) => a + b.units * b.navPrice, 0);
  const pl = totalValue - totalInvested;
  const plPct = totalInvested > 0 ? (pl / totalInvested) * 100 : 0;

  const save = async () => {
    if (!form.name.trim()) return toast.error("Nama reksa dana wajib diisi");
    setSaving(true);
    try {
      const res = await fetch("/api/mutual-funds", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { ...form, id: editId } : form),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Gagal menyimpan");
      toast.success(editId ? "Reksa dana diperbarui" : "Reksa dana ditambahkan");
      setOpen(false);
      setEditId(null);
      setForm(empty);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/mutual-funds?id=${delTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Reksa dana dihapus");
      setDelTarget(null);
      load();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Modal" value={fmtRp(totalInvested)} icon={Wallet} accent="text-primary" />
        <SummaryCard label="Nilai Sekarang" value={fmtRp(totalValue)} icon={Coins} accent="text-blue-600 dark:text-blue-400" />
        <SummaryCard label={`P&L (${plPct.toFixed(1)}%)`} value={fmtRp(pl)} icon={PieChart} accent={pl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
        <SummaryCard label="Total Unit" value={fmtNum(items.reduce((a, b) => a + b.units, 0))} icon={Coins} accent="text-muted-foreground" />
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <button
          onClick={() => {
            setOpen((o) => !o);
            setEditId(null);
            setForm(empty);
          }}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="size-4 text-primary" /> {editId ? "Edit Reksa Dana" : "Tambah Reksa Dana"}
          </span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="space-y-3 border-t p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Nama Reksa Dana</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sucorinvest Money Market" />
              </div>
              <div>
                <Label>Jenis</Label>
                <NativeSelect value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={Object.entries(TYPE_LABEL).map(([k, v]) => ({ value: k, label: v }))} />
              </div>
              <div>
                <Label>Unit Penyertaan</Label>
                <Input type="number" value={form.units || ""} onChange={(e) => setForm({ ...form, units: Number(e.target.value) })} placeholder="100000" />
              </div>
              <div>
                <Label>NAV / Unit (Rp)</Label>
                <RupiahInput value={form.navPrice} onChange={(v) => setForm({ ...form, navPrice: v })} placeholder="1.200" />
              </div>
              <div>
                <Label>Total Modal (Rp)</Label>
                <RupiahInput value={form.investedAmount} onChange={(v) => setForm({ ...form, investedAmount: v })} placeholder="10.000.000" />
              </div>
              <div>
                <Label>Status</Label>
                <NativeSelect value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))} />
              </div>
              <div className="sm:col-span-2">
                <Label>Catatan</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opsional" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void save()} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {editId ? "Simpan Perubahan" : "Tambah"}
              </Button>
              <Button variant="outline" onClick={() => { setOpen(false); setEditId(null); setForm(empty); }}>
                Batal
              </Button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Memuat…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">Belum ada reksa dana — tambahkan lewat form di atas.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => {
            const value = m.units * m.navPrice;
            const p = value - m.investedAmount;
            return (
              <div key={m.id} className="group rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtNum(m.units)} unit</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold", TYPE_COLOR[m.type] ?? "bg-muted text-muted-foreground")}>
                    {TYPE_LABEL[m.type] ?? m.type}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <Stat label="Modal" value={fmtNum(m.investedAmount)} />
                  <Stat label="NAV / unit" value={fmtNum(m.navPrice)} />
                  <Stat label="Nilai sekarang" value={fmtNum(value)} />
                  <Stat label={`P&L (${m.investedAmount > 0 ? (((value - m.investedAmount) / m.investedAmount) * 100).toFixed(1) : 0}%)`} value={fmtNum(p)} accent={p >= 0} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">{STATUS_LABEL[m.status] ?? m.status}</span>
                  <div className="flex gap-1 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="size-6" onClick={() => { setEditId(m.id); setForm({ name: m.name, type: m.type, units: m.units, navPrice: m.navPrice, investedAmount: m.investedAmount, status: m.status, notes: m.notes }); setOpen(true); }} aria-label="Edit">
                      <Pencil className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => setDelTarget(m)} aria-label="Hapus">
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={delTarget !== null}
        onOpenChange={(o) => !o && setDelTarget(null)}
        title="Hapus reksa dana?"
        description={`"${delTarget?.name}" akan dihapus permanen.`}
        onConfirm={() => void remove()}
        busy={deleting}
      />
    </div>
  );
}
