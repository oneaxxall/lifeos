"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Flame,
  Loader2,
  MoonStar,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SpiritualInsight } from "@/lib/ai/spiritual-insight";

import { useInsightPanel } from "@/lib/hooks/use-insight-panel";
interface Props {
  refreshKey: number;
}

/** Panel analisa spiritual AI — konsistensi, kendor, refleksi, target (SPI-02/03/04). Collapsible. */
export function SpiritualInsightPanel({ refreshKey }: Props) {
  const { data, source, loading, collapsed, setCollapsed, fetched } =
    useInsightPanel<SpiritualInsight>("/api/spiritual/analyze", refreshKey, true);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
        <Loader2 className="size-4 animate-spin text-indigo-500" />
        <p className="text-sm text-muted-foreground">AI merangkum konsistensi spiritual…</p>
      </div>
    );
  }

  if (fetched && source === "kosong") return null;

  return (
    <div className="overflow-hidden rounded-xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/8 via-card to-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Perlihatkan analisa spiritual" : "Sembunyikan analisa spiritual"}
          className="size-7 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/15">
          <MoonStar className="size-4 text-indigo-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Konsistensi spiritual AI
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
        <div className="space-y-2.5 px-4 pb-4">
          <div className="grid gap-2.5 md:grid-cols-2">
            {/* Konsistensi */}
            <div className="rounded-lg border border-border/70 bg-background/60 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Flame className="size-3.5" /> Konsistensi
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">{data.konsistensi}</p>
            </div>

            {/* Kendor */}
            <div className="rounded-lg border border-border/70 bg-background/60 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-indigo-500">
                <Sparkles className="size-3.5" /> Pengingat lembut
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">{data.kendor}</p>
            </div>
          </div>

          {/* Refleksi */}
          <div className="rounded-lg bg-indigo-500/5 p-3">
            <p className="mb-1 text-xs font-semibold text-indigo-500">🪞 Refleksi hari ini</p>
            <p className="text-sm leading-relaxed text-foreground/90">{data.refleksi}</p>
          </div>

          {/* Target */}
          <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-background/60 p-3">
            <Target className="mt-0.5 size-4 shrink-0 text-indigo-500" />
            <p className="text-xs leading-relaxed text-muted-foreground">{data.target}</p>
          </div>
        </div>
      )}
    </div>
  );
}
