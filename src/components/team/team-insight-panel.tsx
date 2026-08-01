"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Loader2,
  MessageSquareText,
  Radar,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TeamInsight } from "@/lib/ai/team-insight";

import { useInsightPanel } from "@/lib/hooks/use-insight-panel";
interface Props {
  refreshKey: number;
}

/** Panel analisa tim AI — ringkasan, deteksi dini, persiapan 1-on-1 (TE-03/04). Collapsible. */
export function TeamInsightPanel({ refreshKey }: Props) {
  const { data, source, loading, collapsed, setCollapsed, fetched } =
    useInsightPanel<TeamInsight>("/api/team/analyze", refreshKey, true);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
        <Loader2 className="size-4 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">AI menganalisa tim…</p>
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
          aria-label={collapsed ? "Perlihatkan analisa tim" : "Sembunyikan analisa tim"}
          className="size-7 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
          <UsersRound className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Analisa tim AI
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
          {/* Ringkasan tim */}
          <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
            <UsersRound className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed font-medium">{data.ringkasanTim}</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {/* Deteksi dini */}
            <div className="rounded-lg border border-border/70 bg-background/60 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Radar className="size-3.5" /> Butuh perhatian
              </p>
              {data.perhatian.length === 0 ? (
                <p className="text-xs text-muted-foreground">Tidak ada sinyal yang perlu diwaspadai. 👍</p>
              ) : (
                <ul className="space-y-2">
                  {data.perhatian.map((p, i) => (
                    <li key={i} className="rounded-lg bg-background/60 p-2 text-xs">
                      <p className="font-medium">{p.nama}</p>
                      <p className="mt-0.5 text-muted-foreground">{p.sinyal}</p>
                      <p className="mt-1 text-primary">→ {p.saran}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Persiapan 1-on-1 */}
            <div className="rounded-lg border border-border/70 bg-background/60 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                <MessageSquareText className="size-3.5" /> Persiapan 1-on-1
              </p>
              {data.persiapan.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada riwayat 1-on-1 untuk disiapkan.</p>
              ) : (
                <ul className="space-y-2">
                  {data.persiapan.map((p, i) => (
                    <li key={i} className="rounded-lg bg-background/60 p-2 text-xs">
                      <p className="font-medium">{p.nama}</p>
                      <p className="mt-0.5 text-muted-foreground">{p.ringkasan}</p>
                      <p className="mt-1 flex items-start gap-1">
                        <ClipboardList className="mt-0.5 size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">Pending:</span> {p.actionItemPending}
                        </span>
                      </p>
                      <p className="mt-1 rounded bg-primary/5 p-1.5 leading-relaxed text-primary">
                        💬 {p.saranMulai}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-muted-foreground/70">
            🔒 Data anggota tim adalah data pihak lain — disimpan lokal & dipakai hanya untuk konteks manajemenmu.
          </p>
        </div>
      )}
    </div>
  );
}
