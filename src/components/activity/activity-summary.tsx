"use client";

import * as React from "react";
import { BarChart3, Clock, Flame, Gauge, ListChecks, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/components/time/activity-list";

interface Props {
  activities: ActivityItem[];
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

/** Dashboard sederhana Activity — statistik hari ini, minggu ini, distribusi nilai. */
export function ActivitySummary({ activities }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  // Batas minggu ini (Senin)
  const day = new Date().getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  const monday = new Date();
  monday.setDate(monday.getDate() - mondayOffset);
  const mondayStr = monday.toISOString().slice(0, 10);

  const todayActs = activities.filter((a) => a.startedAt.slice(0, 10) === today);
  const weekActs = activities.filter((a) => a.startedAt.slice(0, 10) >= mondayStr);

  const sum = (list: ActivityItem[]) => list.reduce((acc, a) => acc + (a.durationMinutes || 0), 0);
  const todayMin = sum(todayActs);
  const weekMin = sum(weekActs);

  const produktifMin = weekActs
    .filter((a) => a.categoryValue === "produktif")
    .reduce((acc, a) => acc + (a.durationMinutes || 0), 0);
  const buangMin = weekActs
    .filter((a) => a.categoryValue === "buang")
    .reduce((acc, a) => acc + (a.durationMinutes || 0), 0);

  const valuePct = weekMin > 0 ? Math.round((produktifMin / weekMin) * 100) : 0;
  const buangPct = weekMin > 0 ? Math.round((buangMin / weekMin) * 100) : 0;

  // Top tags minggu ini
  const tagCount = new Map<string, number>();
  for (const a of weekActs) {
    for (const t of parseTags(a.tags)) {
      tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    }
  }
  const topTags = Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Format durasi
  const fmt = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}m`;
    return m ? `${h}j ${m}m` : `${h}j`;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <BarChart3 className="size-4 text-indigo-500" /> Ringkasan aktivitas
      </p>

      <div className="grid grid-cols-1 grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Hari ini */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock className="size-3" /> Hari ini
          </p>
          <p className="mt-1 text-lg font-bold leading-none">{todayActs.length}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">aktivitas · {fmt(todayMin)}</p>
        </div>

        {/* Minggu ini */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            <ListChecks className="size-3" /> Minggu ini
          </p>
          <p className="mt-1 text-lg font-bold leading-none">{weekActs.length}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">aktivitas · {fmt(weekMin)}</p>
        </div>

        {/* Produktifitas */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            <ThumbsUp className="size-3" /> Produktif
          </p>
          <p className="mt-1 text-lg font-bold leading-none text-emerald-500">{valuePct}%</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{fmt(produktifMin)} minggu ini</p>
        </div>

        {/* Waktu terbuang */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Gauge className="size-3" /> Terbuang
          </p>
          <p className="mt-1 text-lg font-bold leading-none text-destructive">{buangPct}%</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{fmt(buangMin)} minggu ini</p>
        </div>
      </div>

      {/* Bar produktif vs buang */}
      {weekMin > 0 && (
        <div className="mt-3">
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            <div className="bg-emerald-500 transition-all" style={{ width: `${valuePct}%` }} />
            <div
              className="bg-sky-500/60 transition-all"
              style={{ width: `${Math.max(0, 100 - valuePct - buangPct)}%` }}
            />
            <div className="bg-rose-500/70 transition-all" style={{ width: `${buangPct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Produktif {valuePct}%
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-sky-500/70" /> Netral {Math.max(0, 100 - valuePct - buangPct)}%
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-rose-500/70" /> Buang {buangPct}%
            </span>
          </div>
        </div>
      )}

      {/* Top tags */}
      {topTags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
          <Flame className="size-3 text-amber-500" />
          <span className="text-[10px] font-medium text-muted-foreground">Tag terpopuler:</span>
          {topTags.map(([tag, n]) => (
            <span
              key={tag}
              className={cn(
                "rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-600 dark:text-amber-400"
              )}
            >
              #{tag} <span className="opacity-60">×{n}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
