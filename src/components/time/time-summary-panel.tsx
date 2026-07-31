"use client";

import * as React from "react";
import { BarChart3, Clock, TrendingDown, TrendingUp } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TimeSummaryData {
  from: string;
  to: string;
  totalMenit: number;
  produktifMenit: number;
  buangMenit: number;
  netralMenit: number;
  kategori: { nama: string; menit: number; value: string; color: string }[];
}

function formatDur(menit: number): string {
  const h = Math.floor(menit / 60);
  const m = menit % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}j ${m}m` : `${h}j`;
}

interface Props {
  data: TimeSummaryData | null;
  /** Ganti rentang (hari/minggu/bulan) */
  range: string;
  onRangeChange: (r: string) => void;
}

const VALUE_COLORS: Record<string, string> = {
  produktif: "#10B981",
  netral: "#0EA5E9",
  buang: "#EF4444",
};

/** Ringkasan waktu — chart donut per kategori + total produktif/buang (TIM-03). */
export function TimeSummaryPanel({ data, range, onRangeChange }: Props) {
  if (!data) return null;

  const chartData = data.kategori.map((k) => ({
    name: k.nama,
    value: k.menit,
    color: k.color || VALUE_COLORS[k.value] || "#0D9488",
  }));

  const pctProduktif = data.totalMenit > 0 ? Math.round((data.produktifMenit / data.totalMenit) * 100) : 0;
  const pctBuang = data.totalMenit > 0 ? Math.round((data.buangMenit / data.totalMenit) * 100) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Kartu statistik */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="size-4 text-primary" /> Ringkasan waktu
          </p>
          <Select value={range} onValueChange={onRangeChange}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue>
                {range === "minggu" ? "7 hari" : range === "bulan" ? "30 hari" : "Hari ini"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hari" className="text-xs">Hari ini</SelectItem>
              <SelectItem value="minggu" className="text-xs">7 hari</SelectItem>
              <SelectItem value="bulan" className="text-xs">30 hari</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> Total tercatat
          </p>
          <p className="text-2xl font-bold tabular-nums">{formatDur(data.totalMenit)}</p>
          <div className="mt-3 space-y-2">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="size-3" /> Produktif
                </span>
                <span className="tabular-nums">{formatDur(data.produktifMenit)} · {pctProduktif}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pctProduktif}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">Netral</span>
                <span className="tabular-nums">{formatDur(data.netralMenit)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${data.totalMenit > 0 ? Math.round((data.netralMenit / data.totalMenit) * 100) : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-destructive">
                  <TrendingDown className="size-3" /> Buang waktu
                </span>
                <span className="tabular-nums">{formatDur(data.buangMenit)} · {pctBuang}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-destructive" style={{ width: `${pctBuang}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart donut per kategori */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
        <p className="mb-2 text-sm font-semibold">Breakdown per kategori</p>
        {chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Belum ada aktivitas tercatat di rentang ini
          </p>
        ) : (
          <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row">
            <ResponsiveContainer width="100%" height={200} className="min-w-0 sm:w-1/2">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={chartData[i].color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatDur(Number(v))}
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="w-full space-y-1.5 sm:w-1/2">
              {data.kategori.slice(0, 8).map((k) => (
                <li key={k.nama} className="flex items-center gap-2 text-xs">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: k.color || VALUE_COLORS[k.value] }} />
                  <span className="min-w-0 flex-1 truncate capitalize">{k.nama}</span>
                  <span className="font-semibold tabular-nums">{formatDur(k.menit)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
