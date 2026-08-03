"use client";

import * as React from "react";
import { ChevronDown, Landmark, Loader2, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface Bond {
  id: number;
  name: string;
  code: string;
  type: string;
  nominal: number;
  buyPrice: number;
  couponRate: number;
  maturityDate: string;
  status: string;
  notes: string;
}

const TYPE_LABEL: Record<string, string> = {
  sbn: "SBN",
  fr: "FR",
  sukuk: "Sukuk",
  korporasi: "Korporasi",
  lainnya: "Lainnya",
};

const TYPE_COLOR: Record<string, string> = {
  sbn: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  fr: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  sukuk: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  korporasi: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  lainnya: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  aktif: "Aktif",
  jatuh_tempo: "Jatuh tempo",
  dijual: "Dijual",
};

const empty = { name: "", code: "", type: "fr", nominal: 0, buyPrice: 100, couponRate: 0, maturityDate: "", status: "aktif", notes: "" };

/** Tab Obligasi — portofolio obligasi + pendapatan kupon. */
export function BondsWorkspace() {
  const [items, setItems] = React.useState<Bond[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const [delTarget, setDelTarget] = React.useState<Bond | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(() => {
    fetch("/api/bonds")
      .then((r) => r.json())
      .then((j) => setItems(j.data ?? []))
      .catch(() => toast.error("Gagal memuat obligasi"))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const totalNominal = items.reduce((a, b) => a + b.nominal, 0);
  const totalCoupon = items.reduce((a, b) => a + (b.nominal * b.couponRate) / 100, 0);
  const totalCost = items.reduce((a, b) => a + Math.round(b.nominal * (b.buyPrice / 100)), 0);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Nama obligasi wajib diisi");
    setSaving(true);
    try {
      const res = await fetch("/api/bonds", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { ...form, id: editId } : form),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Gagal menyimpan");
      toast.success(editId ? "Obligasi diperbarui" : "Obligasi ditambahkan");
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
      const res = await fetch(`/api/bonds?id=${delTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Obligasi dihapus");
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
      {/* Ringkasan */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Nominal" value={fmtRp(totalNominal)} icon={Wallet} accent="text-primary" />
        <SummaryCard label="Kupon / Tahun" value={fmtRp(totalCoupon)} icon={Landmark} accent="text-emerald-600 dark:text-emerald-400" />
        <SummaryCard label="Kupon / Bulan" value={fmtRp(totalCoupon / 12)} icon={Landmark} accent="text-teal-600 dark:text-teal-400" />
        <SummaryCard label="Harga Beli Total" value={fmtRp(totalCost)} icon={Wallet} accent="text-muted-foreground" />
      </div>

      {/* Form collapsible */}
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
            <Plus className="size-4 text-primary" /> {editId ? "Edit Obligasi" : "Tambah Obligasi"}
          </span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="space-y-3 border-t p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Nama Obligasi</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Obligasi Negara FR0090" />
              </div>
              <div>
                <Label>Kode Seri</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="FR0090" />
              </div>
              <div>
                <Label>Jenis</Label>
                <NativeSelect
                  value={form.type}
                  onChange={(v) => setForm({ ...form, type: v })}
                  options={Object.entries(TYPE_LABEL).map(([k, v]) => ({ value: k, label: v }))}
                />
              </div>
              <div>
                <Label>Status</Label>
                <NativeSelect
                  value={form.status}
                  onChange={(v) => setForm({ ...form, status: v })}
                  options={Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
                />
              </div>
              <div>
                <Label>Nominal (Rp)</Label>
                <RupiahInput value={form.nominal} onChange={(v) => setForm({ ...form, nominal: v })} placeholder="10.000.000" />
              </div>
              <div>
                <Label>Harga Beli (%)</Label>
                <Input type="number" value={form.buyPrice || ""} onChange={(e) => setForm({ ...form, buyPrice: Number(e.target.value) })} placeholder="100" />
              </div>
              <div>
                <Label>Kupon / Tahun (%)</Label>
                <Input type="number" value={form.couponRate || ""} onChange={(e) => setForm({ ...form, couponRate: Number(e.target.value) })} placeholder="6.5" />
              </div>
              <div>
                <Label>Jatuh Tempo</Label>
                <Input type="date" value={form.maturityDate} onChange={(e) => setForm({ ...form, maturityDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Catatan</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opsional" />
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

      {/* List */}
      {loading ? (
        <p className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Memuat…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">Belum ada obligasi — tambahkan lewat form di atas.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => (
            <div key={b.id} className="group rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{b.name}</p>
                  <p className="text-[10px] text-muted-foreground">{b.code || "—"}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold", TYPE_COLOR[b.type] ?? TYPE_COLOR.lainnya)}>
                  {TYPE_LABEL[b.type] ?? "Lainnya"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <Stat label="Nominal" value={fmtNum(b.nominal)} />
                <Stat label={`Kupon ${b.couponRate}% / th`} value={fmtNum((b.nominal * b.couponRate) / 100)} accent />
                <Stat label="Beli" value={`${b.buyPrice}%`} />
                <Stat label="Jatuh tempo" value={b.maturityDate || "—"} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">{STATUS_LABEL[b.status] ?? b.status}</span>
                <div className="flex gap-1 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => { setEditId(b.id); setForm({ name: b.name, code: b.code, type: b.type, nominal: b.nominal, buyPrice: b.buyPrice, couponRate: b.couponRate, maturityDate: b.maturityDate, status: b.status, notes: b.notes }); setOpen(true); }} aria-label="Edit">
                    <Pencil className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => setDelTarget(b)} aria-label="Hapus">
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={delTarget !== null}
        onOpenChange={(o) => !o && setDelTarget(null)}
        title="Hapus obligasi?"
        description={`"${delTarget?.name}" akan dihapus permanen.`}
        onConfirm={() => void remove()}
        busy={deleting}
      />
    </div>
  );
}

export function SummaryCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof Wallet; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60", accent)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

export function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className={cn("truncate text-[11px] font-bold", accent && "text-emerald-600 dark:text-emerald-400")}>{value}</p>
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{children}</label>;
}

export function NativeSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function fmtRp(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}
export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("id-ID");
}
