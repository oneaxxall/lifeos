"use client";

import * as React from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DelayedTodo, DelayInsight } from "@/lib/ai/todo-delay";
import { useInsightPanel } from "@/lib/hooks/use-insight-panel";

interface Props {
  refreshKey: number;
}

interface DelayData {
  delayed: DelayedTodo[];
  insight: DelayInsight | null;
}

/** Panel deteksi penundaan — tugas tertunda + pola AI (TDO-05). Collapsible. */
export function TodoDelayPanel({ refreshKey }: Props) {
  const { data, source, loading, collapsed, setCollapsed, fetched } =
    useInsightPanel<DelayData>("/api/ai/todo-delay", refreshKey);

  const delayed = data?.delayed ?? [];
  const insight = data?.insight ?? null;

  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5">
        <Loader2 className="size-4 animate-spin text-destructive" />
        <p className="text-sm text-muted-foreground">Memeriksa penundaan…</p>
      </div>
    );
  }

  if (fetched && (source === "kosong" || delayed.length === 0)) {
    return null; // Tidak ada tugas tertunda — panel disembunyikan
  }

  return (
    <div className="overflow-hidden rounded-xl border border-destructive/25 bg-gradient-to-br from-destructive/8 via-card to-card shadow-sm">
      {/* Header bar */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Perlihatkan tugas tertunda" : "Sembunyikan tugas tertunda"}
          className="size-7 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </Button>

        <div className="flex size-7 items-center justify-center rounded-lg bg-destructive/15">
          <AlertTriangle className="size-4 text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {delayed.length} tugas tertunda
            {source === "heuristik" && (
              <Badge variant="outline" className="ml-2 align-middle text-[9px]">
                offline
              </Badge>
            )}
          </p>
          {delayed[0] && (
            <p className="truncate text-[10px] text-muted-foreground">
              Terlama: {delayed[0].judul} ({delayed[0].daysOverdue} hari)
            </p>
          )}
        </div>
      </div>

      {/* Isi panel */}
      {!collapsed && data && (
        <div className="px-4 pb-4">
          <ul className="space-y-2">
            {delayed.slice(0, 5).map((d) => (
              <li
                key={d.id}
                className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-background/60 p-2.5"
              >
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium leading-snug">{d.judul}</p>
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[10px] text-destructive"
                    >
                      +{d.daysOverdue} hari
                    </Badge>
                    {d.area && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] capitalize">
                        {d.area}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {d.reason}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {insight && (
            <div className="mt-2.5 rounded-lg bg-primary/5 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Lightbulb className="size-3.5" /> Pola & saran AI
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {insight.pola} {insight.saran}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
