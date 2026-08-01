"use client";

import * as React from "react";
import {
  Briefcase,
  Loader2,
  PieChart,
  Plus,
  RefreshCcw,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface Position {
  id: number;
  code: string;
  lot: number;
  shares: number;
  buyPrice: number;
  marketPrice: number;
  buyDate: string;
  notes: string;
}

interface Summary {
  totalCost: number;
  totalValue: number;
  unrealized: number;
  unrealizedPct: number;
}

function fmtRp(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

/** Section Portofolio — posisi saham dimiliki + nilai pasar + P/L. */
export function StockPortfolio() {
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [deleteTarget, setDeleteTarget] = React.useState<Position | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Form tambah
  const [code, setCode] = React.useState("");
  const [lot, setLot] = React.useState(1);
  const [buyPrice, setBuyPrice] = React.useState(0);
  const [buyDate, setBuyDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = React.useState(false);
  /** Form tambah collapsible — default tertutup */
  const [formOpen, setFormOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stocks/portfolio");
        const json = await res.json();
        if (cancelled) return;
        setPositions(json.data ?? []);
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

  const add = async () => {
    const c = code.trim().toUpperCase();
    if (!c) {
      toast.error("Isi kode saham dulu (mis. BBRI)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/stocks/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, lot, buyPrice, buyDate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success(`Posisi ${c} ditambahkan 📊`);
      setCode("");
      setLot(1);
      setBuyPrice(0);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah");
    } finally {
      setSaving(false);
    }
  };

  /** Update harga pasar (tanpa reload penuh) */
  const updateMarket = async (p: Position, marketPrice: number) => {
    try {
      const res = await fetch("/api/stocks/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, lot: p.lot, buyPrice: p.buyPrice, marketPrice }),
      });
      if (!res.ok) throw new Error();
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Gagal memperbarui harga");
    }
  };

  const remove = async (p: Position) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/stocks/portfolio/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`Posisi ${p.code} dihapus`);
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Ringkasan ── */}
      <div className="grid grid-cols-1 grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Wallet className="size-3 text-primary" /> Total modal
          </p>
          <p className="mt-1 text-lg font-bold leading-none">{fmtRp(summary?.totalCost ?? 0)}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{positions.length} posisi</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            <PieChart className="size-3 text-indigo-500" /> Nilai pasar
          </p>
          <p className="mt-1 text-lg font-bold leading-none">{fmtRp(summary?.totalValue ?? 0)}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">harga terkini</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="size-3 text-emerald-500" /> Untung (rugi)
          </p>
          <p
            className={cn(
              "mt-1 text-lg font-bold leading-none",
              (summary?.unrealized ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"
            )}
          >
            {(summary?.unrealized ?? 0) >= 0 ? "+" : "-"}
            {fmtRp(Math.abs(summary?.unrealized ?? 0))}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {(summary?.unrealizedPct ?? 0) >= 0 ? "+" : ""}
            {(summary?.unrealizedPct ?? 0).toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Briefcase className="size-3 text-amber-500" /> Total lembar
          </p>
          <p className="mt-1 text-lg font-bold leading-none">
            {positions.reduce((a, p) => a + p.shares, 0).toLocaleString("id-ID")}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {positions.reduce((a, p) => a + p.lot, 0)} lot
          </p>
        </div>
      </div>

      {/* ── Form tambah (collapsible — tombol di header) ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <button
          onClick={() => setFormOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          aria-expanded={formOpen}
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Plus className={cn("size-4 text-primary transition-transform", formOpen && "rotate-45")} />
            Tambah posisi saham
          </p>
          <span className="text-[10px] font-medium text-muted-foreground">
            {formOpen ? "Sembunyikan" : "Tampilkan"}
          </span>
        </button>
        {formOpen && (
        <div className="grid grid-cols-1 gap-2.5 border-t border-border/60 px-4 py-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Kode saham</span>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="BBRI"
              className="h-8 text-sm uppercase"
              onKeyDown={(e) => e.key === "Enter" && void add()}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Lot</span>
            <Input
              type="number"
              min={1}
              value={lot || ""}
              onChange={(e) => setLot(Number(e.target.value))}
              className="h-8 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Harga beli</span>
            <RupiahInput value={buyPrice} onChange={setBuyPrice} prefix />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Tanggal beli</span>
            <Input
              type="date"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
              className="h-8 text-sm"
            />
          </label>
          <div className="flex items-end">
            <Button onClick={() => void add()} disabled={saving} className="h-8 w-full gap-1.5 text-xs">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Tambah
            </Button>
          </div>
        </div>
        )}
      </div>

      {/* ── Tabel posisi (Stockbit Complete View — 4 kolom, 2 info per kolom) ── */}
      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Memuat portofolio…
        </div>
      ) : positions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada posisi saham — tambahkan saham yang kamu miliki di atas. 📊
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* Header 4 kolom (atas-bawah) */}
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 border-b border-border/60 px-3 py-2 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="leading-tight">
              Code<span className="block font-normal text-muted-foreground/70">Lot</span>
            </span>
            <span className="text-right leading-tight">
              Invested<span className="block font-normal text-muted-foreground/70">Avg</span>
            </span>
            <span className="text-right leading-tight">
              Market<span className="block font-normal text-muted-foreground/70">Current</span>
            </span>
            <span className="text-right leading-tight">
              P&amp;L<span className="block font-normal text-muted-foreground/70">Gain %</span>
            </span>
          </div>

          {positions.map((p) => {
            const cost = p.shares * p.buyPrice;
            const value = p.marketPrice > 0 ? p.shares * p.marketPrice : cost;
            const pl = value - cost;
            const plPct = cost > 0 ? (pl / cost) * 100 : 0;
            const pos = pl >= 0;
            return (
              <div
                key={p.id}
                className="group relative grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center gap-2 border-b border-border/40 px-3 py-2.5 last:border-0 hover:bg-muted/20"
              >
                {/* Code / Lot */}
                <div className="flex items-center gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight">{p.code}</p>
                    <p className="text-[10px] leading-tight text-muted-foreground">{p.lot} lot</p>
                  </div>
                </div>

                {/* Invested / Avg */}
                <div className="text-right">
                  <p className="text-xs font-semibold tabular-nums leading-tight">
                    {fmtRp(cost)}
                  </p>
                  <p className="text-[10px] tabular-nums leading-tight text-muted-foreground">
                    Avg {p.buyPrice.toLocaleString("id-ID")}
                  </p>
                </div>

                {/* Market / Current */}
                <div className="text-right">
                  <p className="text-xs font-semibold tabular-nums leading-tight">
                    {fmtRp(value)}
                  </p>
                  <RupiahInput
                    ghost
                    value={p.marketPrice}
                    onChange={(v) => void updateMarket(p, v)}
                    className="tabular-nums text-muted-foreground"
                    placeholder={p.marketPrice > 0 ? "" : "ketik harga"}
                  />
                </div>

                {/* P/L / Gain % */}
                <div className="text-right">
                  <p
                    className={cn(
                      "text-xs font-bold tabular-nums leading-tight",
                      pos ? "text-emerald-500" : "text-rose-500"
                    )}
                  >
                    {pos ? "+" : "-"}
                    {fmtRp(Math.abs(pl))}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] tabular-nums leading-tight",
                      pos ? "text-emerald-500/80" : "text-rose-500/80"
                    )}
                  >
                    {pos ? "+" : ""}
                    {plPct.toFixed(1)}%
                  </p>
                </div>

                {/* Hapus (hover) */}
                <button
                  onClick={() => setDeleteTarget(p)}
                  aria-label={`Hapus ${p.code}`}
                  className="absolute right-2 top-2 rounded p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}

          <div className="flex items-center justify-between border-t border-border/60 px-3 py-2 text-[10px] text-muted-foreground">
            <span>Klik harga (Current) untuk update nilai & P/L real-time.</span>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-muted"
            >
              <RefreshCcw className="size-3" /> Segarkan
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus posisi"
        description={`Hapus posisi ${deleteTarget?.code} (${deleteTarget?.lot} lot) dari portofolio?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
