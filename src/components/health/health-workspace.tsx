"use client";

import * as React from "react";
import { toast } from "sonner";
import { HealthForm } from "@/components/health/health-form";
import { HealthTrends, type HealthEntryItem } from "@/components/health/health-trends";
import { HealthGoals, type HealthGoalItem } from "@/components/health/health-goals";
import { HealthInsightPanel } from "@/components/health/health-insight-panel";
import { HealthEntryList } from "@/components/health/health-entry-list";

/** Orchestrator Health — state, fetch, compose komponen. */
export function HealthWorkspace() {
  const [entries, setEntries] = React.useState<HealthEntryItem[]>([]);
  const [goal, setGoal] = React.useState<HealthGoalItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const loadAll = React.useCallback(async () => {
    try {
      const [entryRes, goalRes] = await Promise.all([
        fetch("/api/health/entries"),
        fetch("/api/health/goals"),
      ]);
      const [entryJson, goalJson] = await Promise.all([entryRes.json(), goalRes.json()]);
      setEntries(entryJson.data ?? []);
      setGoal(goalJson.data ?? null);
    } catch {
      toast.error("Gagal memuat data kesehatan");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal — fetch langsung di effect (setState hanya setelah await)
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/health/entries"), fetch("/api/health/goals")])
      .then(([entryRes, goalRes]) => Promise.all([entryRes.json(), goalRes.json()]))
      .then(([entryJson, goalJson]) => {
        if (cancelled) return;
        setEntries(entryJson.data ?? []);
        setGoal(goalJson.data ?? null);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat data kesehatan");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Statistik 7 hari terakhir untuk progress bar target
  const stats = React.useMemo(() => {
    const last7 = entries.slice(0, 7);
    const sum = (fn: (e: HealthEntryItem) => number | null) =>
      last7.filter((e) => fn(e)).reduce((s, e) => s + (fn(e) || 0), 0);
    const count = (fn: (e: HealthEntryItem) => number | null) =>
      last7.filter((e) => fn(e)).length;

    const latestWeight = [...entries].reverse().find((e) => e.weightKg)?.weightKg ?? 0;
    return {
      weeklyExercise: sum((e) => e.exerciseMinutes),
      avgSleep: count((e) => e.sleepHours) ? sum((e) => e.sleepHours) / count((e) => e.sleepHours) : 0,
      avgSteps: count((e) => e.steps) ? Math.round(sum((e) => e.steps) / count((e) => e.steps)) : 0,
      latestWeight,
    };
  }, [entries]);

  const handleChanged = () => {
    void loadAll();
    setRefreshKey((k) => k + 1);
  };

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
      <HealthInsightPanel refreshKey={refreshKey} />

      <HealthForm onSaved={handleChanged} />

      <HealthTrends entries={entries} />

      <HealthEntryList entries={entries} onChanged={handleChanged} />

      <HealthGoals
        goal={goal}
        weeklyExercise={stats.weeklyExercise}
        avgSleep={stats.avgSleep}
        avgSteps={stats.avgSteps}
        latestWeight={stats.latestWeight}
        onChanged={handleChanged}
      />
    </div>
  );
}
