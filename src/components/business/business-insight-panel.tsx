"use client";

import * as React from "react";
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  Loader2,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BusinessPriority } from "@/lib/ai/business-insight";

import { useInsightPanel } from "@/lib/hooks/use-insight-panel";
interface Props {
  refreshKey: number;
}

/** Panel prioritas proyek AI mingguan (BIZ-04). Collapsible. */
export function BusinessInsightPanel({ refreshKey }: Props) {
  const { data, source, loading, collapsed, setCollapsed, fetched } =
    useInsightPanel<BusinessPriority>("/api/business/analyze", refreshKey, true);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
        <Loader2 className="size-4 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">AI menganalisa prioritas proyek…</p>
      </div>
    );
  }

  if (fetched && source === "kosong") return null;

  return (
    <div className="overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Perlihatkan prioritas bisnis" : "Sembunyikan prioritas bisnis"}
          className="size-7 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
          <Briefcase className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Prioritas bisnis minggu ini
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
          {/* Fokus utama */}
          <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
            <Target className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed font-medium">{data.fokus}</p>
          </div>

          {/* Prioritas */}
          <ul className="space-y-2">
            {data.prioritas.map((p, i) => (
              <li key={i} className="rounded-lg border border-border/70 bg-background/60 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="truncate text-sm font-medium">{p.proyek}</p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  <span className="text-foreground">Alasan:</span> {p.alasan}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  <span className="text-foreground">Minggu ini:</span> {p.saran}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
