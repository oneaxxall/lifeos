"use client";

import * as React from "react";
import { toast } from "sonner";
import { TimerBar, type ActivityCategoryOption, type RunningActivity } from "@/components/time/timer-bar";
import { TimeSummaryPanel, type TimeSummaryData } from "@/components/time/time-summary-panel";
import { ActivityList, type ActivityItem } from "@/components/time/activity-list";
import { TimeBlockPanel, type TimeBlockItem } from "@/components/time/time-block-panel";
import { TimeInsightPanel } from "@/components/time/time-insight-panel";

/** Orchestrator Time Management — state, fetch, compose komponen. */
export function TimeWorkspace() {
  const [categories, setCategories] = React.useState<ActivityCategoryOption[]>([]);
  const [running, setRunning] = React.useState<RunningActivity | null>(null);
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [summary, setSummary] = React.useState<TimeSummaryData | null>(null);
  const [blocks, setBlocks] = React.useState<TimeBlockItem[]>([]);
  const [range, setRange] = React.useState("hari");
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const loadAll = React.useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const from = range === "minggu" ? weekAgo : range === "bulan" ? monthAgo : today;
    const to = today;

    try {
      const [actRes, catRes, sumRes, blockRes] = await Promise.all([
        fetch("/api/time/activities"),
        fetch("/api/time/categories"),
        fetch(`/api/time/summary?from=${from}&to=${to}`),
        fetch(`/api/time/blocks?day=${today}`),
      ]);
      const [actJson, catJson, sumJson, blockJson] = await Promise.all([
        actRes.json(),
        catRes.json(),
        sumRes.json(),
        blockRes.json(),
      ]);
      setActivities(actJson.data ?? []);
      setCategories(catJson.data ?? []);
      setRunning(actJson.active ?? null);
      setSummary(sumJson.data ?? null);
      setBlocks(blockJson.data ?? []);
    } catch {
      toast.error("Gagal memuat data waktu");
    } finally {
      setLoading(false);
    }
  }, [range]);

  // Muat awal — fetch langsung di effect (setState hanya setelah await)
  React.useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const from = range === "minggu" ? weekAgo : range === "bulan" ? monthAgo : today;
    const to = today;

    Promise.all([
      fetch("/api/time/activities"),
      fetch("/api/time/categories"),
      fetch(`/api/time/summary?from=${from}&to=${to}`),
      fetch(`/api/time/blocks?day=${today}`),
    ])
      .then(([actRes, catRes, sumRes, blockRes]) =>
        Promise.all([actRes.json(), catRes.json(), sumRes.json(), blockRes.json()])
      )
      .then(([actJson, catJson, sumJson, blockJson]) => {
        if (cancelled) return;
        setActivities(actJson.data ?? []);
        setCategories(catJson.data ?? []);
        setRunning(actJson.active ?? null);
        setSummary(sumJson.data ?? null);
        setBlocks(blockJson.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat data waktu");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <TimeInsightPanel refreshKey={refreshKey} />

      <TimerBar
        categories={categories}
        running={running}
        onChanged={() => {
          void loadAll();
          setRefreshKey((k) => k + 1);
        }}
      />

      <TimeSummaryPanel
        data={summary}
        range={range}
        onRangeChange={setRange}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <TimeBlockPanel
          blocks={blocks}
          categories={categories}
          onChanged={() => void loadAll()}
        />
        <ActivityList
          activities={activities}
          onChanged={() => void loadAll()}
        />
      </div>
    </div>
  );
}
