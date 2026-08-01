"use client";

import * as React from "react";
import {
  ArrowDownUp,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Info,
  Layers,
  PieChart,
  TrendingDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { StockPlansPanel, type StockPlanItem } from "@/components/stocks/stock-plans-panel";
import { StockPortfolio } from "@/components/stocks/stock-portfolio";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  LOT_SIZE,
  calcAvgDown,
  calcLotFee,
  calcRightIssue,
  fmtRp,
  type AvgDownInput,
  type LotFeeInput,
  type RightIssueInput,
} from "@/lib/stock-calc";

type Tab = "portfolio" | "avgdown" | "rightissue" | "lotfee";

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "portfolio", label: "Portofolio", icon: PieChart, desc: "Posisi saham & P/L" },
  { id: "avgdown", label: "Avg Down / Up", icon: TrendingDown, desc: "Hitung harga rata-rata baru & break-even" },
  { id: "rightissue", label: "Right Issue (HMETD)", icon: Layers, desc: "Harga teoritis ex-right & nilai right" },
  { id: "lotfee", label: "Lot & Fee", icon: Briefcase, desc: "Biaya broker & laba bersih" },
];

function NumInput({
  label,
  value,
  onChange,
  suffix,
  rupiah,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  rupiah?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium text-muted-foreground">{label}</span>
      {rupiah ? (
        <RupiahInput value={value} onChange={onChange} prefix />
      ) : (
        <div className="relative">
          <Input
            type="number"
            value={value || ""}
            placeholder="0"
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-8 text-sm"
          />
          {suffix && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
      )}
    </label>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" /> {title}
      </p>
      {children}
    </div>
  );
}

function Stat({ label, value, className, sub }: { label: string; value: string; className?: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-base font-bold leading-none", className)}>{value}</p>
      {sub && <p className="mt-0.5 text-[9px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Halaman Stocks — portofolio, avg down, right issue, lot & fee + rencana tersimpan. */
export function StocksWorkspace() {
  const [tab, setTab] = React.useState<Tab>("portfolio");

  // ── state avg down ──
  const [avg, setAvg] = React.useState<AvgDownInput>({
    sharesOld: 10 * LOT_SIZE,
    priceOld: 1000,
    sharesNew: 10 * LOT_SIZE,
    priceNew: 800,
    marketPrice: 900,
  });
  const avgR = calcAvgDown(avg);

  // ── state right issue ──
  const [ri, setRi] = React.useState<RightIssueInput>({
    sharesOwned: 15 * LOT_SIZE,
    ratioOld: 15,
    ratioNew: 1,
    exercisePrice: 500,
    marketPrice: 1000,
  });
  const riR = calcRightIssue(ri);

  // ── state lot & fee ──
  const [lf, setLf] = React.useState<LotFeeInput>({ lot: 2, buyPrice: 1000, sellPrice: 1100 });
  const lfR = calcLotFee(lf);

  /** Muat rencana tersimpan → isi ulang kalkulator. */
  const onLoadPlan = (plan: StockPlanItem) => {
    const input = (plan.input ?? {}) as Record<string, number>;
    if (plan.type === "avgdown") {
      setAvg({
        sharesOld: Number(input.sharesOld ?? avg.sharesOld),
        priceOld: Number(input.priceOld ?? avg.priceOld),
        sharesNew: Number(input.sharesNew ?? avg.sharesNew),
        priceNew: Number(input.priceNew ?? avg.priceNew),
        marketPrice: Number(input.marketPrice ?? avg.marketPrice),
      });
      setTab("avgdown");
      toast.success(`Rencana ${plan.code} dimuat ke kalkulator 📈`);
    } else if (plan.type === "rightissue") {
      setRi({
        sharesOwned: Number(input.sharesOwned ?? ri.sharesOwned),
        ratioOld: Number(input.ratioOld ?? ri.ratioOld),
        ratioNew: Number(input.ratioNew ?? ri.ratioNew),
        exercisePrice: Number(input.exercisePrice ?? ri.exercisePrice),
        marketPrice: Number(input.marketPrice ?? ri.marketPrice),
      });
      setTab("rightissue");
      toast.success(`Rencana ${plan.code} dimuat ke kalkulator 🧩`);
    } else {
      setLf({
        lot: Number(input.lot ?? lf.lot),
        buyPrice: Number(input.buyPrice ?? lf.buyPrice),
        sellPrice: Number(input.sellPrice ?? lf.sellPrice),
      });
      setTab("lotfee");
      toast.success(`Rencana ${plan.code} dimuat ke kalkulator 💼`);
    }
  };

  /** Snapshot input+hasil state aktif — disimpan bersama rencana. */
  const getSnapshot = (): { input: Record<string, unknown>; result: Record<string, unknown> } => {
    if (tab === "avgdown") return { input: { ...avg }, result: { ...avgR } };
    if (tab === "rightissue") return { input: { ...ri }, result: { ...riR } };
    return { input: { ...lf }, result: { ...lfR } };
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BarChart3 className="size-6 text-primary" /> Stocks
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Portofolio & kalkulator saham: average down/up, right issue (HMETD), dan estimasi biaya broker.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted/40"
            )}
            title={t.desc}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── 0. PORTOFOLIO ── */}
      {tab === "portfolio" && <StockPortfolio />}

      {/* ── 1. AVG DOWN ── */}
      {tab === "avgdown" && (
        <>
          <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <Card title="Input posisi" icon={ArrowDownUp}>
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <NumInput label="Saham lama" value={Math.round(avg.sharesOld / LOT_SIZE)} onChange={(v) => setAvg({ ...avg, sharesOld: v * LOT_SIZE })} suffix="lot" />
                  <NumInput label="Harga beli lama" value={avg.priceOld} onChange={(v) => setAvg({ ...avg, priceOld: v })} rupiah />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumInput label="Saham tambahan" value={Math.round(avg.sharesNew / LOT_SIZE)} onChange={(v) => setAvg({ ...avg, sharesNew: v * LOT_SIZE })} suffix="lot" />
                  <NumInput label="Harga beli baru" value={avg.priceNew} onChange={(v) => setAvg({ ...avg, priceNew: v })} rupiah />
                </div>
                <NumInput label="Harga pasar sekarang (untuk P/L)" value={avg.marketPrice} onChange={(v) => setAvg({ ...avg, marketPrice: v })} rupiah />
              </div>
              <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-muted/40 p-2 text-[10px] text-muted-foreground">
                <Info className="mt-0.5 size-3 shrink-0" />
                <span>Avg down = beli lagi di harga lebih rendah untuk menurunkan rata-rata modal.</span>
              </div>
            </Card>

            <Card title="Hasil" icon={BarChart3}>
              <div className="grid grid-cols-1 grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label="Total posisi" value={`${(avgR.totalShares / LOT_SIZE).toLocaleString("id-ID")} lot`} sub={`${avgR.totalShares.toLocaleString("id-ID")} lembar`} />
                <Stat label="Total modal" value={fmtRp(avgR.totalCost)} sub="beli lama + baru" />
                <Stat
                  label="Harga rata-rata"
                  value={fmtRp(avgR.avgCost)}
                  className="text-primary"
                  sub={`harga baru ${avgR.avgDiffPct >= 0 ? "+" : ""}${avgR.avgDiffPct}% dari avg`}
                />
                <Stat
                  label="Break-even"
                  value={fmtRp(avgR.breakEvenPrice)}
                  sub="harga jual agar balik modal (incl. fee)"
                />
                <Stat
                  label="P/L sekarang"
                  value={`${avgR.unrealizedPct >= 0 ? "+" : ""}${avgR.unrealizedPct}%`}
                  className={avgR.unrealizedPct >= 0 ? "text-emerald-500" : "text-rose-500"}
                  sub={fmtRp(avgR.unrealizedRp)}
                />
                <Stat
                  label="Target +10%"
                  value={fmtRp(avgR.targetPrice(10))}
                  sub="harga jual untuk untung 10%"
                />
              </div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", avgR.unrealizedPct >= 0 ? "bg-emerald-500" : "bg-rose-500")}
                  style={{ width: `${Math.min(100, Math.abs(avgR.unrealizedPct) * 3)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {avgR.unrealizedPct >= 0
                  ? "▲ Posisi kamu untung di harga pasar sekarang."
                  : "▼ Posisi masih rugi — avg down atau tunggu harga naik."}
              </p>
            </Card>
          </div>

          <StockPlansPanel activeType="avgdown" onLoad={onLoadPlan} getSnapshot={getSnapshot} />
        </>
      )}

      {/* ── 2. RIGHT ISSUE ── */}
      {tab === "rightissue" && (
        <>
          <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <Card title="Input right issue" icon={Layers}>
              <div className="space-y-2.5">
                <NumInput label="Saham dimiliki" value={Math.round(ri.sharesOwned / LOT_SIZE)} onChange={(v) => setRi({ ...ri, sharesOwned: v * LOT_SIZE })} suffix="lot" />
                <div className="grid grid-cols-2 gap-2">
                  <NumInput label="Rasio lama" value={ri.ratioOld} onChange={(v) => setRi({ ...ri, ratioOld: v })} suffix=": x" />
                  <NumInput label="Rasio baru" value={ri.ratioNew} onChange={(v) => setRi({ ...ri, ratioNew: v })} suffix="lembar" />
                </div>
                <NumInput label="Harga pelaksanaan (exercise)" value={ri.exercisePrice} onChange={(v) => setRi({ ...ri, exercisePrice: v })} rupiah />
                <NumInput label="Harga pasar (cum-right)" value={ri.marketPrice} onChange={(v) => setRi({ ...ri, marketPrice: v })} rupiah />
              </div>
              <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-muted/40 p-2 text-[10px] text-muted-foreground">
                <Info className="mt-0.5 size-3 shrink-0" />
                <span>
                  Contoh rasio 15:1 = setiap 15 saham lama berhak beli 1 saham baru di harga pelaksanaan.
                </span>
              </div>
            </Card>

            <Card title="Hasil" icon={BarChart3}>
              <div className="grid grid-cols-1 grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label="Hak right kamu" value={`${riR.rights.toLocaleString("id-ID")} lbr`} className="text-primary" sub={`dari ${(ri.sharesOwned / LOT_SIZE).toLocaleString("id-ID")} lot`} />
                <Stat label="Harga teoritis (TERP)" value={fmtRp(riR.terp)} sub="harga ex-right setelah penyesuaian" />
                <Stat label="Nilai per right" value={fmtRp(riR.rightValue)} className="text-emerald-500" sub="premi right yang bisa dijual" />
                <Stat label="Dana ikut right" value={fmtRp(riR.costToSubscribe)} sub="jika ikut semua hak" />
                <Stat label="Dilusi jika tidak ikut" value={`${riR.dilutionPct}%`} className="text-rose-500" sub="kepemilikanmu terdilusi" />
                <Stat label="Penurunan harga" value={`-${riR.priceDropPct}%`} sub="dari cum ke ex-right" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  <span>
                    Ikut right: bayar <b>{fmtRp(riR.costToSubscribe)}</b> → kepemilikan tetap{" "}
                    <b>{riR.ownershipAfter}%</b>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
                  <TrendingDown className="size-3.5" />
                  <span>
                    Tidak ikut: jual right ≈ <b>{fmtRp(riR.rightValue)}</b>/lembar, atau terima dilusi{" "}
                    <b>{riR.dilutionPct}%</b>
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <StockPlansPanel activeType="rightissue" onLoad={onLoadPlan} getSnapshot={getSnapshot} />
        </>
      )}

      {/* ── 3. LOT & FEE ── */}
      {tab === "lotfee" && (
        <>
          <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <Card title="Input transaksi" icon={Briefcase}>
              <div className="space-y-2.5">
                <NumInput label="Jumlah lot" value={lf.lot} onChange={(v) => setLf({ ...lf, lot: v })} suffix="lot" />
                <NumInput label="Harga beli" value={lf.buyPrice} onChange={(v) => setLf({ ...lf, buyPrice: v })} rupiah />
                <NumInput label="Harga jual (target)" value={lf.sellPrice} onChange={(v) => setLf({ ...lf, sellPrice: v })} rupiah />
              </div>
              <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-muted/40 p-2 text-[10px] text-muted-foreground">
                <Info className="mt-0.5 size-3 shrink-0" />
                <span>
                  Asumsi fee broker: beli 0.18%, jual 0.28% + pajak 0.1% (standar IDX).
                </span>
              </div>
            </Card>

            <Card title="Hasil" icon={BarChart3}>
              <div className="grid grid-cols-1 grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label="Total lembar" value={`${lfR.shares.toLocaleString("id-ID")} lbr`} sub={`${lf.lot} lot × 100`} />
                <Stat label="Nilai beli" value={fmtRp(lfR.buyValue)} sub={`fee ${fmtRp(lfR.buyFee)}`} />
                <Stat label="Nilai jual" value={fmtRp(lfR.sellValue)} sub={`fee ${fmtRp(lfR.sellFee)} + pajak ${fmtRp(lfR.taxSell)}`} />
                <Stat
                  label="Laba bersih"
                  value={`${lfR.netProfit >= 0 ? "+" : ""}${fmtRp(lfR.netProfit)}`}
                  className={lfR.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}
                  sub={`${lfR.netProfitPct >= 0 ? "+" : ""}${lfR.netProfitPct}% dari modal`}
                />
                <Stat label="Total biaya" value={fmtRp(lfR.totalFees)} sub="beli + jual + pajak" />
                <Stat label="Break-even jual" value={fmtRp(lfR.breakEvenSell)} sub="harga minimal agar tidak rugi" />
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground">
                Total biaya transaksi ≈ <b>{fmtRp(lfR.totalFees)}</b> ({lf.sellPrice > 0 && lf.buyPrice > 0 ? ((lfR.totalFees / lfR.buyValue) * 100).toFixed(2) : 0}% dari nilai beli). Pastikan
                kenaikan harga melebihi angka ini agar untung.
              </p>
            </Card>
          </div>

          <StockPlansPanel activeType="lotfee" onLoad={onLoadPlan} getSnapshot={getSnapshot} />
        </>
      )}
    </div>
  );
}
