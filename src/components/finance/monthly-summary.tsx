"use client";

import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

export interface MonthlySummaryData {
  bulan: string;
  masuk: number;
  keluar: number;
  saldo: number;
  kategori: { nama: string; total: number }[];
}

const COLORS = [
  "#0D9488", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6",
  "#EC4899", "#10B981", "#F97316", "#6366F1", "#14B8A6",
];

function formatRp(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/** Ringkasan bulanan: total masuk/keluar/saldo + pie chart per kategori (FIN-03). */
export function MonthlySummary({ data }: { data: MonthlySummaryData | null }) {
  if (!data) return null;

  const chartData = data.kategori.slice(0, 8).map((k) => ({
    name: k.nama,
    value: k.total,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Kartu total */}
      <div className="grid gap-4 sm:grid-cols-3 lg:col-span-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <ArrowUpCircle className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pemasukan</p>
            <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatRp(data.masuk)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10">
            <ArrowDownCircle className="size-5 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pengeluaran</p>
            <p className="text-lg font-bold tabular-nums text-destructive">
              {formatRp(data.keluar)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Wallet className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p
              className={cn(
                "text-lg font-bold tabular-nums",
                data.saldo >= 0 ? "text-primary" : "text-destructive"
              )}
            >
              {formatRp(data.saldo)}
            </p>
          </div>
        </div>
      </div>

      {/* Pie chart per kategori */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
        <p className="mb-2 text-sm font-semibold">Pengeluaran per kategori</p>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada pengeluaran bulan ini
          </p>
        ) : (
          <div className="flex h-[220px] min-w-0 items-center">
            <ResponsiveContainer width="50%" height="100%" className="min-w-0">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatRp(Number(v))}
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex-1 space-y-1.5">
              {data.kategori.slice(0, 6).map((k, i) => (
                <li key={k.nama} className="flex items-center gap-2 text-xs">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate capitalize">{k.nama}</span>
                  <span className="font-semibold tabular-nums">
                    {formatRp(k.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Daftar kategori teratas */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold">Kategori terbesar</p>
        {data.kategori.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada data
          </p>
        ) : (
          <ol className="space-y-2">
            {data.kategori.slice(0, 5).map((k, i) => {
              const pct = data.keluar > 0 ? Math.round((k.total / data.keluar) * 100) : 0;
              return (
                <li key={k.nama}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 capitalize">
                      <span className="flex size-4 items-center justify-center rounded bg-muted text-[10px] font-bold">
                        {i + 1}
                      </span>
                      {k.nama}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatRp(k.total)} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
