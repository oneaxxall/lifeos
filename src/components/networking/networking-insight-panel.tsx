"use client";

import * as React from "react";
import {
  BellRing,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Handshake,
  Loader2,
  Network,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NetworkingInsight } from "@/lib/ai/networking-insight";

interface Props {
  refreshKey: number;
}

/** Panel networking AI — follow-up + saran mingguan (NW-02/03). Collapsible. */
export function NetworkingInsightPanel({ refreshKey }: Props) {
  const [data, setData] = React.useState<NetworkingInsight | null>(null);
  const [source, setSource] = React.useState<"ai" | "heuristik" | "kosong" | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [collapsed, setCollapsed] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/networking/analyze", { method: "POST" })
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
        <p className="text-sm text-muted-foreground">AI menganalisa jaringan…</p>
      </div>
    );
  }

  if (source === "kosong" || !data) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Perlihatkan analisa networking" : "Sembunyikan analisa networking"}
          className="size-7 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
          <Network className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Networking AI
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
          {/* Analisa jaringan */}
          <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
            <Network className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed font-medium">{data.analisa}</p>
          </div>

          {/* Follow-up */}
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <BellRing className="size-3.5" /> Perlu follow-up (&gt;90 hari)
            </p>
            {data.followUp.length === 0 ? (
              <p className="text-xs text-muted-foreground">Semua relasi hangat — pertahankan! 🤝</p>
            ) : (
              <ul className="space-y-2">
                {data.followUp.map((f, i) => (
                  <li key={i} className="rounded-lg bg-background/60 p-2">
                    <p className="flex flex-wrap items-center gap-2 text-xs font-medium">
                      <UserRound className="size-3 text-primary" />
                      {f.nama}
                      <Badge className="bg-amber-500/15 text-[9px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/15">
                        +{f.hari} hari
                      </Badge>
                    </p>
                    <p className="mt-0.5 text-[11px] italic text-muted-foreground">📍 {f.konteks}</p>
                    <p className="mt-1 rounded-md bg-primary/5 p-2 text-xs leading-relaxed">
                      💬 <span className="font-medium">Saran pesan:</span> {f.saranPesan}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Saran mingguan */}
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <CalendarClock className="size-3.5" /> Hubungi minggu ini
            </p>
            <ol className="space-y-1.5">
              {data.saranMingguan.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">{s.nama}</span>{" "}
                    <span className="text-muted-foreground">— {s.alasan}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <p className="text-[10px] leading-relaxed text-muted-foreground/70">
            <Handshake className="mr-1 inline size-3" />
            Relasi yang terpelihara membuka peluang — AI hanya mengingatkan, pesan tetap kamu yang kirim.
          </p>
        </div>
      )}
    </div>
  );
}
