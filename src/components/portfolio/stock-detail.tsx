"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, Loader2, PieChart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Pie, PieChart as RePieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

interface Pos {
  id: number;
  code: string;
  lot: number;
  availableLot: number;
  shares: number;
  buyPrice: number;
  marketPrice: number;
  buyDate: string;
  notes: string;
}

const PALETTE = ["#0D9488", "#6366F1", "#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#3B82F6", "#EC4899", "#84CC16", "#F97316"];

function fmtRp(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}
function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("id-ID");
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3.5 shadow-sm">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-base font-bold leading-none", accent)}>{value}</p>
      {sub && <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Halaman detail posisi saham — gaya Stockbit + alokasi portofolio. */
export function StockDetail({ id }: { id: number }) {
  const [positions, setPositions] = React.useState<Pos[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stocks/portfolio");
        const json = await res.json();
        if (!cancelled) setPositions(json.data ?? []);
      } catch {
        // biarkan kosong
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pos = positions.find((p) => p.id === id);
  const totalValue = positions.reduce((a, p) => a + (p.marketPrice > 0 ? p.shares * p.marketPrice : p.shares * p.buyPrice), 0);

  // Alokasi portofolio (berdasarkan nilai pasar)
  const alloc = positions.map((p) => {
    const v = p.marketPrice > 0 ? p.shares * p.marketPrice : p.shares * p.buyPrice;
    return { code: p.code, value: v, pct: totalValue > 0 ? (v / totalValue) * 100 : 0 };
  });

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Memuat detail…
      </p>
    );
  }

  if (!pos) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">Posisi saham tidak ditemukan.</p>
        <Link href="/portfolio" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
          <ArrowLeft className="size-3.5" /> Kembali ke Portofolio
        </Link>
      </div>
    );
  }

  const shares = pos.shares;
  const cost = shares * pos.buyPrice;
  const value = pos.marketPrice > 0 ? shares * pos.marketPrice : cost;
  const pl = value - cost;
  const plPct = cost > 0 ? (pl / cost) * 100 : 0;
  const posPl = pl >= 0;
  const available = pos.availableLot > 0 ? pos.availableLot : pos.lot;
  const myPct = totalValue > 0 ? (value / totalValue) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/portfolio"
          aria-label="Kembali ke Portofolio"
          title="Kembali ke Portofolio"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-tight">{pos.code}</h1>
          <p className="text-xs text-muted-foreground">
            {pos.lot} lot · {shares.toLocaleString("id-ID")} lembar{pos.buyDate ? ` · beli ${pos.buyDate}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            posPl ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}
        >
          {posPl ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
        </span>
      </div>

      {/* Statistik utama */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Balance Lot" value={`${pos.lot} lot`} sub={`${fmtNum(shares)} lembar`} accent="text-foreground" />
        <StatCard label="Available Lot" value={`${available} lot`} sub={available !== pos.lot ? `${pos.lot - available} lot terkunci` : "semua bisa dijual"} accent="text-primary" />
        <StatCard label="Average Price" value={fmtNum(pos.buyPrice)} sub="harga beli rata-rata" />
        <StatCard label="Current Price" value={pos.marketPrice > 0 ? fmtNum(pos.marketPrice) : "—"} sub={pos.marketPrice > 0 ? "harga pasar" : "belum diisi"} />
        <StatCard label="Invested" value={fmtRp(cost)} sub="total modal" />
        <StatCard label="Market Value" value={fmtRp(value)} sub={pos.marketPrice > 0 ? "nilai pasar" : "= modal (harga belum diisi)"} />
        <StatCard
          label="Potential P&L"
          value={`${posPl ? "+" : "-"}${fmtRp(Math.abs(pl))}`}
          sub={`${posPl ? "+" : ""}${plPct.toFixed(2)}%`}
          accent={posPl ? "text-emerald-500" : "text-rose-500"}
        />
        <StatCard label="Portofolio Share" value={`${myPct.toFixed(1)}%`} sub="dari total portofolio" accent="text-indigo-500" />
      </div>

      {/* Alokasi portofolio */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <PieChart className="size-4 text-primary" /> Portofolio Allocation
        </p>
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
          <div className="h-48 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={alloc} dataKey="value" nameKey="code" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {alloc.map((a, i) => (
                    <Cell key={a.code} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtRp(Number(v))} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {alloc.map((a, i) => (
              <div key={a.code} className={cn("flex items-center gap-2 rounded-lg px-2 py-1", a.code === pos.code && "bg-muted/50")}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                <span className={cn("text-xs font-semibold", a.code === pos.code ? "text-primary" : "text-foreground")}>{a.code}</span>
                <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{fmtNum(a.value)}</span>
                <span className="w-11 text-right text-[10px] font-bold tabular-nums">{a.pct.toFixed(1)}%</span>
              </div>
            ))}
            {alloc.length === 0 && <p className="text-xs text-muted-foreground">Belum ada posisi lain untuk perbandingan.</p>}
          </div>
        </div>
      </div>

      {pos.notes && (
        <div className="rounded-xl border bg-card p-3.5 text-xs text-muted-foreground shadow-sm">
          <span className="mr-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">
            <Briefcase className="size-3" /> Catatan
          </span>
          {pos.notes}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Wallet className="size-3" />
        Update harga di halaman Portofolio untuk perhitungan P&L real-time.
      </p>
    </div>
  );
}
