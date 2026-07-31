"use client";

import * as React from "react";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TodoPriority } from "@/lib/ai/todo-priority";
import { cn } from "@/lib/utils";

interface Props {
  /** Dipicu otomatis saat jumlah tugas aktif berubah */
  refreshKey: number;
}

/** Panel saran prioritas AI — 3 tugas terpenting hari ini + alasan (TDO-04).
 *  Collapsible: bisa ditutup agar tidak memakan space UI. */
export function TodoPriorityPanel({ refreshKey }: Props) {
  const [data, setData] = React.useState<TodoPriority | null>(null);
  const [source, setSource] = React.useState<"ai" | "heuristik" | "kosong" | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [collapsed, setCollapsed] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/ai/todo-priority", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setData(json.data ?? null);
        setSource(json.source ?? null);
      } else {
        setError(json.error || "Gagal memuat saran");
      }
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal — fetch langsung di effect (setState hanya setelah await)
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/todo-priority", { method: "POST" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.ok) {
          setData(json.data ?? null);
          setSource(json.source ?? null);
        } else {
          setError(json.error || "Gagal memuat saran");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Gagal terhubung ke server");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const refresh = () => {
    setLoading(true);
    setError("");
    void load();
  };

  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <Loader2 className="size-4 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">AI sedang menyusun prioritas hari ini…</p>
      </div>
    );
  }

  if (source === "kosong" || (!data || data.prioritas.length === 0)) {
    return null; // Tidak ada tugas aktif — panel disembunyikan
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
      {/* Header bar — selalu tampil, klik untuk toggle */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Perlihatkan prioritas AI" : "Sembunyikan prioritas AI"}
          className="size-7 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </Button>

        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
          <Bot className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Prioritas hari ini
            {source === "heuristik" && (
              <Badge variant="outline" className="ml-2 align-middle text-[9px]">
                offline
              </Badge>
            )}
          </p>
          {source === "heuristik" && (
            <p className="truncate text-[10px] text-muted-foreground">
              Mode offline — set AI_API_KEY untuk saran cerdas
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={refresh}
          disabled={loading}
          aria-label="Muat ulang saran prioritas"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Isi panel — disembunyikan saat collapsed */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <ol className="space-y-2">
            {data.prioritas.map((p, i) => (
              <li
                key={p.judul}
                className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/60 p-2.5"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium leading-snug">{p.judul}</p>
                    {p.estimasiMenit ? (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">
                        ±{p.estimasiMenit}m
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 flex items-start gap-1 text-xs leading-relaxed text-muted-foreground">
                    <Sparkles className="mt-0.5 size-3 shrink-0 text-primary/70" />
                    {p.alasan}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {data.ringkasan && (
            <p className="mt-2.5 flex items-start gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
              {data.ringkasan}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
