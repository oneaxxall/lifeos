"use client";

import * as React from "react";
import { ChevronDown, Gem, Loader2, Pencil, Plus, Scale, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtNum, fmtRp, Label, Stat, SummaryCard } from "@/components/portfolio/bonds-workspace";

export interface GoldHolding {
  id: number;
  name: string;
  grams: number;
  buyPricePerGram: number;
  currentPricePerGram: number;
  status: string;
  notes: string;
}

const STATUS_LABEL: Record<string, string> = { simpan: "Disimpan", dijual: "Dijual" };

const empty = { name: "", grams: 0, buyPricePerGram: 0, currentPricePerGram: 0, status: "simpan", notes: "" };

/** Tab Emas — portofolio emas batangan/keping. */
export function GoldWorkspace() {
  const [items, setItems] = React.useState<GoldHolding[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const [delTarget, setDelTarget] = React.useState<GoldHolding | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(() => {
    fetch("/api/gold")
      .then((r) => r.json())
      .then((j) => setItems(j.data ?? []))
      .catch(() => toast.error("Gagal memuat emas"))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const totalGrams = items.reduce((a, b) => a + b.grams, 0);
  const totalCost = items.reduce((a, b) => a + b.grams * b.buyPricePerGram, 0);
  const totalValue = items.reduce((a, b) => a + (b.currentPricePerGram > 0 ? b.grams * b.currentPricePerGram : b.grams * b.buyPricePerGram), 0);
  const pl = totalValue - totalCost;
  const plPct = totalCost > 0 ? (pl / totalCost) * 100 : 0;

  const save = async () => {
    if (!form.name.trim()) return toast.error("Nama emas wajib diisi");
    setSaving(true);
    try {
      const res = await fetch("/api/gold", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { ...form, id: editId } : form),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Gagal menyimpan");
      toast.success(editId ? "Emas diperbarui" : "Emas ditambahkan");
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
      const res = await fetch(`/api/gold?id=${delTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Emas dihapus");
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
        <SummaryCard label="Total Gram" value={`${fmtNum(totalGrams)} gr`} icon={Scale} accent="text-amber-600 dark:text-amber-400" />
        <SummaryCard label="Modal" value={fmtRp(totalCost)} icon={Wallet} accent="text-primary" />
        <SummaryCard label="Nilai Sekarang" value={fmtRp(totalValue)} icon={Gem} accent="text-amber-600 dark:text-amber-400" />
        <SummaryCard label={`P&L (${plPct.toFixed(1)}%)`} value={fmtRp(pl)} icon={Gem} accent={pl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
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
            <Plus className="size-4 text-primary" /> {editId ? "Edit Emas" : "Tambah Emas"}
          </span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="space-y-3 border-t p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Nama / Jenis</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Antam 24k" />
              </div>
              <div>
                <Label>Berat (gram)</Label>
                <Input type="number" step="0.1" value={form.grams || ""} onChange={(e) => setForm({ ...form, grams: Number(e.target.value) })} placeholder="10.5" />
              </div>
              <div>
                <Label>Harga Beli / gram (Rp)</Label>
                <RupiahInput value={form.buyPricePerGram} onChange={(v) => setForm({ ...form, buyPricePerGram: v })} placeholder="1.500.000" />
              </div>
              <div>
                <Label>Harga Sekarang / gram (Rp)</Label>
                <RupiahInput value={form.currentPricePerGram} onChange={(v) => setForm({ ...form, currentPricePerGram: v })} placeholder="1.550.000" />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
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
        <p className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">Belum ada emas — tambahkan lewat form di atas.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((g) => {
            const cur = g.currentPricePerGram > 0 ? g.currentPricePerGram : g.buyPricePerGram;
            const cost = g.grams * g.buyPricePerGram;
            const value = g.grams * cur;
            const p = value - cost;
            return (
              <div key={g.id} className="group rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{g.name}</p>
                    <p className="text-[10px] text-muted-foreground">{g.grams} gram</p>
                  </div>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                    <Gem className="size-4 text-amber-600 dark:text-amber-400" />
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <Stat label="Harga beli /gr" value={fmtNum(g.buyPricePerGram)} />
                  <Stat label="Harga skrg /gr" value={fmtNum(cur)} />
                  <Stat label="Modal" value={fmtNum(cost)} />
                  <Stat label={`P&L (${cost > 0 ? ((p / cost) * 100).toFixed(1) : 0}%)`} value={fmtNum(p)} accent={p >= 0} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">{STATUS_LABEL[g.status] ?? g.status}</span>
                  <div className="flex gap-1 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="size-6" onClick={() => { setEditId(g.id); setForm({ name: g.name, grams: g.grams, buyPricePerGram: g.buyPricePerGram, currentPricePerGram: g.currentPricePerGram, status: g.status, notes: g.notes }); setOpen(true); }} aria-label="Edit">
                      <Pencil className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => setDelTarget(g)} aria-label="Hapus">
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
        title="Hapus emas?"
        description={`"${delTarget?.name}" akan dihapus permanen.`}
        onConfirm={() => void remove()}
        busy={deleting}
      />
    </div>
  );
}
