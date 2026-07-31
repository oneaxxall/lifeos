"use client";

import * as React from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Lightbulb,
  Loader2,
  Repeat,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FinanceInsight } from "@/lib/ai/finance-insight";
import { cn } from "@/lib/utils";
import { useInsightPanel } from "@/lib/hooks/use-insight-panel";

interface Props {
  refreshKey: number;
}

function formatRp(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const SARAN_META = {
  hapus: { label: "Hapus", className: "bg-destructive/10 text-destructive" },
  pertahankan: { label: "Pertahankan", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  negosiasi: { label: "Negosiasi", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
} as const;

/** Panel analisa keuangan AI — pemborosan, subscription, kebiasaan (FIN-06/07/08). Collapsible. */
export function FinanceInsightPanel({ refreshKey }: Props) {
  const { data, source, loading, collapsed, setCollapsed, fetched } =
    useInsightPanel<FinanceInsight>("/api/finance/analyze", refreshKey, true);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
        <Loader2 className="size-4 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">AI menganalisa keuangan…</p>
      </div>
    );
  }

  if (fetched && source === "kosong") return null;

  const itemCount =
    (data?.pemborosan?.length ?? 0) +
    (data?.subscription?.length ?? 0) +
    (data?.kebiasaan?.length ?? 0);
  if (fetched && itemCount === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Perlihatkan analisa keuangan" : "Sembunyikan analisa keuangan"}
          className="size-7 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
          <TrendingDown className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Analisa keuangan AI
            {source === "heuristik" && (
              <Badge variant="outline" className="ml-2 align-middle text-[9px]">
                offline
              </Badge>
            )}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {data?.ringkasan ?? "Klik untuk menganalisa"}
          </p>
        </div>
      </div>

      {/* Isi */}
      {!collapsed && data && (
        <div className="grid gap-3 px-4 pb-4 md:grid-cols-3">
          {/* Pemborosan */}
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-destructive">
              <AlertTriangle className="size-3.5" /> Pemborosan
            </p>
            {(data.pemborosan ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak terdeteksi.</p>
            ) : (
              <ul className="space-y-2">
                {data.pemborosan.map((p, i) => (
                  <li key={i} className="text-xs">
                    <p className="font-medium capitalize">
                      {p.kategori} · <span className="text-destructive font-semibold">{formatRp(p.total)}</span>
                    </p>
                    <p className="mt-0.5 leading-relaxed text-muted-foreground">{p.rekomendasi}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Subscription */}
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <CreditCard className="size-3.5" /> Subscription
            </p>
            {(data.subscription ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada langganan aktif.</p>
            ) : (
              <ul className="space-y-2">
                {data.subscription.map((s, i) => (
                  <li key={i} className="text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{s.nama}</span>
                      <span className={cn("rounded px-1.5 py-px text-[9px] font-semibold", SARAN_META[s.saran].className)}>
                        {SARAN_META[s.saran].label}
                      </span>
                    </div>
                    <p className="mt-0.5 leading-relaxed text-muted-foreground">
                      {formatRp(s.biayaBulanan)}/bln — {s.alasan}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Kebiasaan */}
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Repeat className="size-3.5" /> Kebiasaan buruk
            </p>
            {(data.kebiasaan ?? []).length === 0 ? (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lightbulb className="size-3" /> Pola buruk belum terdeteksi.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.kebiasaan.map((k, i) => (
                  <li key={i} className="text-xs">
                    <p className="font-medium">{k.pola}</p>
                    <p className="mt-0.5 leading-relaxed text-muted-foreground">
                      {k.dampak} — <span className="text-foreground">{k.saran}</span>
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
