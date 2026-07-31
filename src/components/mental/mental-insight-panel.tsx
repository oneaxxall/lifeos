"use client";

import * as React from "react";
import {
  Brain,
  ChevronDown,
  ChevronRight,
  HeartHandshake,
  Link2,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MentalInsight } from "@/lib/ai/mental-insight";

import { useInsightPanel } from "@/lib/hooks/use-insight-panel";
interface Props {
  refreshKey: number;
}

/** Panel analisa mental AI — pola mood, korelasi lintas fitur, saran (MEN-03/04/05).
 *  Collapsible + disclaimer etika. */
export function MentalInsightPanel({ refreshKey }: Props) {
  const { data, source, loading, collapsed, setCollapsed, fetched } =
    useInsightPanel<MentalInsight>("/api/mental/analyze", refreshKey, true);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
        <Loader2 className="size-4 animate-spin text-violet-600" />
        <p className="text-sm text-muted-foreground">AI menganalisa mood…</p>
      </div>
    );
  }

  if (fetched && source === "kosong") return null;

  return (
    <div className="overflow-hidden rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/8 via-card to-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Perlihatkan analisa mental" : "Sembunyikan analisa mental"}
          className="size-7 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/15">
          <Brain className="size-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Analisa mental AI
            {source === "heuristik" && (
              <Badge variant="outline" className="ml-2 align-middle text-[9px]">
                offline
              </Badge>
            )}
            {data?.butuhProfesional && (
              <Badge className="ml-2 align-middle bg-amber-500/15 text-[9px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/15">
                💛 butuh dukungan
              </Badge>
            )}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{data?.ringkasan ?? "Klik untuk menganalisa"}</p>
        </div>
      </div>

      {/* Isi */}
      {!collapsed && data && (
        <div className="space-y-3 px-4 pb-4">
          <div className="grid gap-3 md:grid-cols-2">
            {/* Pola mood */}
            <div className="rounded-lg border border-border/70 bg-background/60 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400">
                <TrendingUp className="size-3.5" /> Pola mood
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">{data.pola}</p>
            </div>

            {/* Korelasi */}
            <div className="rounded-lg border border-border/70 bg-background/60 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Link2 className="size-3.5" /> Korelasi lintas fitur
              </p>
              <ul className="space-y-1.5">
                {data.korelasi.map((k, i) => (
                  <li key={i} className="text-xs leading-relaxed">
                    <span className="font-medium text-foreground">{k.faktor}:</span>{" "}
                    <span className="text-muted-foreground">{k.temuan}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Saran */}
          <div className="flex items-start gap-2 rounded-lg bg-violet-500/5 p-3">
            <HeartHandshake className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-violet-700 dark:text-violet-300">{data.saran}</p>
            </div>
          </div>

          {/* Disclaimer etika */}
          <p className="text-[10px] leading-relaxed text-muted-foreground/70">
            ⚠️ Ini dukungan umum, bukan diagnosis medis. Jika kamu merasa terbebani
            berkepanjangan, konsultasi dengan profesional kesehatan mental sangat disarankan.
            Datamu tetap lokal & privat.
          </p>
        </div>
      )}
    </div>
  );
}
