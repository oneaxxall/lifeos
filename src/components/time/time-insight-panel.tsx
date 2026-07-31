"use client";

import * as React from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TimeInsight } from "@/lib/ai/time-insight";

interface Props {
  refreshKey: number;
}

function formatDur(menit: number): string {
  const h = Math.floor(menit / 60);
  const m = menit % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}j ${m}m` : `${h}j`;
}

/** Panel analisa waktu AI — pemborosan, jam puncak, ringkasan mingguan (TIM-05/06/07). Collapsible. */
export function TimeInsightPanel({ refreshKey }: Props) {
  const [data, setData] = React.useState<TimeInsight | null>(null);
  const [source, setSource] = React.useState<"ai" | "heuristik" | "kosong" | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [collapsed, setCollapsed] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/time/analyze", { method: "POST" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.ok) {
          setData(json.data ?? null);
          setSource(json.source ?? null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
        <Loader2 className="size-4 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">AI menganalisa penggunaan waktu…</p>
      </div>
    );
  }

  if (source === "kosong" || !data) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Perlihatkan analisa waktu" : "Sembunyikan analisa waktu"}
          className="size-7 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
          <Clock className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Analisa waktu AI
            {source === "heuristik" && (
              <Badge variant="outline" className="ml-2 align-middle text-[9px]">
                offline
              </Badge>
            )}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{data.ringkasan}</p>
        </div>
      </div>

      {/* Isi */}
      {!collapsed && (
        <div className="grid gap-3 px-4 pb-4 md:grid-cols-3">
          {/* Pemborosan */}
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-destructive">
              <AlertTriangle className="size-3.5" /> Pemborosan waktu
            </p>
            {data.pemborosan.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak terdeteksi minggu ini. 👍</p>
            ) : (
              <ul className="space-y-2">
                {data.pemborosan.map((p, i) => (
                  <li key={i} className="text-xs">
                    <p className="font-medium capitalize">
                      {p.kategori} ·{" "}
                      <span className="font-semibold text-destructive">{formatDur(p.durasiMenit)}</span>
                    </p>
                    <p className="mt-0.5 leading-relaxed text-muted-foreground">{p.saran}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Jam puncak & jadwal */}
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <CalendarClock className="size-3.5" /> Jam puncak & jadwal
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{data.jamPuncak}</p>
            <ul className="mt-2 space-y-1.5">
              {data.saranJadwal.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-primary/15 text-[9px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed text-muted-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mingguan */}
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-3.5" /> Ringkasan mingguan
            </p>
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="rounded bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-600 dark:text-emerald-400">
                {formatDur(data.mingguan.produktifMenit)} produktif
              </span>
              <span className="rounded bg-destructive/10 px-2 py-1 font-semibold text-destructive">
                {formatDur(data.mingguan.buangMenit)} buang
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{data.mingguan.tren}</p>
            <p className="mt-2 rounded-md bg-primary/5 p-2 text-xs leading-relaxed">
              💡 <span className="font-medium">Perbaikan:</span> {data.mingguan.perbaikan}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
