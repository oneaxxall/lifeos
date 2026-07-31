"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  HandHeart,
  Lightbulb,
  Loader2,
  Radar,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { HabitInsight } from "@/lib/ai/habit-insight";
import { useInsightPanel } from "@/lib/hooks/use-insight-panel";

interface Props {
  habitId: number;
  refreshKey: number;
  /** Dipanggil SETELAH analisa selesai — agar kartu me-refresh data tersimpan */
  onAnalyzed?: () => void;
}

/** Panel analisa AI per kebiasaan — pemicu, pengganti, refleksi (BH-04/05). */
export function HabitInsightPanel({ habitId, refreshKey, onAnalyzed }: Props) {
  const { data, source, loading, collapsed, setCollapsed, fetched } =
    useInsightPanel<HabitInsight>(`/api/habits/analyze?habitId=${habitId}`, refreshKey, false);

  // Beri tahu kartu sekali setelah analisa dimuat (hindari loop refresh)
  const notifiedRef = React.useRef(false);
  React.useEffect(() => {
    if (fetched && !notifiedRef.current && source !== "kosong") {
      notifiedRef.current = true;
      onAnalyzed?.();
    }
  }, [fetched, source, onAnalyzed]);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <Loader2 className="size-4 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">AI menganalisa kebiasaan ini…</p>
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
          aria-label={collapsed ? "Perlihatkan analisa kebiasaan ini" : "Sembunyikan analisa kebiasaan ini"}
          className="size-7 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
          <Radar className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Analisa AI kebiasaan ini
            {source === "heuristik" && (
              <Badge variant="outline" className="ml-2 align-middle text-[9px]">
                offline
              </Badge>
            )}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {data?.pesan ?? "Klik untuk menganalisa"}
          </p>
        </div>
      </div>

      {/* Isi */}
      {!collapsed && data && (
        <div className="space-y-3 px-4 pb-4">
          {/* Pesan penyemangat */}
          {data.pesan && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <HandHeart className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <p className="text-sm leading-relaxed font-medium">{data.pesan}</p>
            </div>
          )}

          {/* Pemicu */}
          {data.pemicu.length > 0 && (
            <div className="rounded-lg border border-border/70 bg-background/60 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-destructive">
                <Radar className="size-3.5" /> Pola pemicu
              </p>
              <ul className="space-y-2">
                {data.pemicu.map((p, i) => (
                  <li key={i} className="text-xs">
                    <p className="font-medium">{p.pola}</p>
                    <p className="mt-0.5 leading-relaxed text-muted-foreground">
                      {p.konteks} <span className="text-foreground">{p.saran}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pengganti */}
          {data.pengganti.length > 0 && (
            <div className="rounded-lg border border-border/70 bg-background/60 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Lightbulb className="size-3.5" /> Saran pengganti
              </p>
              <ul className="space-y-1.5">
                {data.pengganti.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                    <Sparkles className="mt-0.5 size-3 shrink-0 text-primary/70" />
                    <span>
                      <span className="font-medium">{g.pemicu}:</span> {g.gantiDengan}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Refleksi */}
          {data.refleksi && (
            <p className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
              {data.refleksi}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
