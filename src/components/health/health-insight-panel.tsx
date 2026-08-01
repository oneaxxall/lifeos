"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  HeartPulse,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { HealthInsight } from "@/lib/ai/health-insight";

import { useInsightPanel } from "@/lib/hooks/use-insight-panel";
interface Props {
  refreshKey: number;
}

/** Panel analisa kesehatan AI — tren, kebiasaan buruk, rekomendasi (HLT-04/05/06). Collapsible. */
export function HealthInsightPanel({ refreshKey }: Props) {
  const { data, source, loading, collapsed, setCollapsed, fetched } =
    useInsightPanel<HealthInsight>("/api/health/analyze", refreshKey, true);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
        <Loader2 className="size-4 animate-spin text-emerald-600" />
        <p className="text-sm text-muted-foreground">AI menganalisa kesehatan…</p>
      </div>
    );
  }

  if (fetched && source === "kosong") return null;

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/8 via-card to-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Perlihatkan analisa kesehatan" : "Sembunyikan analisa kesehatan"}
          className="size-7 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15">
          <HeartPulse className="size-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Analisa kesehatan AI
            {source === "heuristik" && (
              <Badge variant="outline" className="ml-2 align-middle text-[9px]">
                offline
              </Badge>
            )}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{data?.ringkasan ?? "Klik untuk menganalisa"}</p>
        </div>
      </div>

      {/* Isi */}
      {!collapsed && data && (
        <div className="grid grid-cols-1 gap-3 px-4 pb-4 md:grid-cols-3">
          {/* Tren */}
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Activity className="size-3.5" /> Tren 4 minggu
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{data.tren}</p>
            <ul className="mt-2 space-y-1.5">
              {data.rekomendasi.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-emerald-500/15 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed text-muted-foreground">{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Kebiasaan buruk */}
          <div className="rounded-lg border border-border/70 bg-background/60 p-3 md:col-span-2">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3.5" /> Kebiasaan buruk terdeteksi
            </p>
            {data.kebiasaanBuruk.length === 0 ? (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lightbulb className="size-3" /> Pola buruk belum terdeteksi — pertahankan!
              </p>
            ) : (
              <ul className="space-y-2">
                {data.kebiasaanBuruk.map((k, i) => (
                  <li key={i} className="rounded-lg bg-background/60 p-2 text-xs">
                    <p className="font-medium text-foreground">{k.pola}</p>
                    <p className="mt-0.5 leading-relaxed text-muted-foreground">
                      {k.dampak} <span className="text-foreground">→ {k.saran}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
