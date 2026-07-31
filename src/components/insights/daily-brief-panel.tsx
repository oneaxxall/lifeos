"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Crosshair,
  Loader2,
  RefreshCw,
  Sunrise,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DailyBrief } from "@/lib/ai/insights";
import { useInsightPanel } from "@/lib/hooks/use-insight-panel";

interface Props {
  refreshKey: number;
}

/** Brief harian AI + perintah tindakan (IN-01/02). Collapsible. */
export function DailyBriefPanel({ refreshKey }: Props) {
  const { data, source, loading, collapsed, setCollapsed, fetched } =
    useInsightPanel<DailyBrief>("/api/insights/daily", refreshKey, false);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <Loader2 className="size-4 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">AI menyiapkan brief harianmu…</p>
      </div>
    );
  }

  if (fetched && source === "kosong") return null;

  return (
    <div className="overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Perlihatkan brief harian" : "Sembunyikan brief harian"}
          className="size-7 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
          <Sunrise className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Brief harian
            {source === "heuristik" && (
              <Badge variant="outline" className="ml-2 align-middle text-[9px]">
                offline
              </Badge>
            )}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      {/* Isi */}
      {!collapsed && data && (
        <div className="space-y-3 px-4 pb-4">
          <p className="rounded-lg border border-border/70 bg-background/60 p-3 text-sm leading-relaxed">
            {data.ringkasan}
          </p>

          {/* Perintah tindakan */}
          <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/10 p-3">
            <Crosshair className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-bold text-primary">SATU TINDAKAN HARI INI</p>
              <p className="mt-1 text-sm font-medium leading-relaxed">{data.perintah}</p>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="size-3" /> Fokus: {data.fokus}
          </p>
        </div>
      )}
    </div>
  );
}
