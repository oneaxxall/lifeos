"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Link2,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { WeeklyReport } from "@/lib/ai/insights";

interface Props {
  refreshKey: number;
}

/** Laporan mingguan + korelasi lintas fitur (IN-04/05). Collapsible default tertutup. */
export function WeeklyReportPanel({ refreshKey }: Props) {
  const [data, setData] = React.useState<WeeklyReport | null>(null);
  const [source, setSource] = React.useState<"ai" | "heuristik" | "kosong" | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [collapsed, setCollapsed] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/insights/weekly", { method: "POST" })
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
        <p className="text-sm text-muted-foreground">AI menyusun laporan mingguan…</p>
      </div>
    );
  }

  if (source === "kosong" || !data) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Perlihatkan laporan mingguan" : "Sembunyikan laporan mingguan"}
          className="size-7 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <TrendingUp className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Laporan mingguan
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
        <div className="space-y-2.5 px-4 pb-4">
          <p className="rounded-lg border border-border/70 bg-background/60 p-3 text-sm leading-relaxed">
            {data.ringkasan}
          </p>

          {/* Korelasi */}
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Link2 className="size-3.5" /> Korelasi lintas fitur
            </p>
            <ul className="space-y-2">
              {data.korelasi.map((k, i) => (
                <li key={i} className="rounded-lg bg-background/60 p-2 text-xs">
                  <p className="flex flex-wrap items-center gap-1 font-medium">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{k.fiturA}</span>
                    <span className="text-muted-foreground">↔</span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{k.fiturB}</span>
                  </p>
                  <p className="mt-1 leading-relaxed text-muted-foreground">{k.temuan}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Rekomendasi */}
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">💡 Rekomendasi minggu depan</p>
            <ul className="space-y-1.5">
              {data.rekomendasi.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
