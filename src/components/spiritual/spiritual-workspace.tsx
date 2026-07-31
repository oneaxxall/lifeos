"use client";

import * as React from "react";
import { toast } from "sonner";
import { RitualForm, type SpiritualEntryItem } from "@/components/spiritual/ritual-form";
import { SpiritualGoalsPanel, type SpiritualGoalItem } from "@/components/spiritual/spiritual-goals-panel";
import { SpiritualInsightPanel } from "@/components/spiritual/spiritual-insight-panel";
import { SpiritualHistory } from "@/components/spiritual/spiritual-history";
import { computeSpiritualStats } from "@/lib/spiritual-stats";

/** Orchestrator Spiritual — state, fetch, compose komponen. */
export function SpiritualWorkspace() {
  const [entries, setEntries] = React.useState<SpiritualEntryItem[]>([]);
  const [goal, setGoal] = React.useState<SpiritualGoalItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const loadAll = React.useCallback(async () => {
    try {
      const [entryRes, goalRes] = await Promise.all([
        fetch("/api/spiritual/entries"),
        fetch("/api/spiritual/goals"),
      ]);
      const [entryJson, goalJson] = await Promise.all([entryRes.json(), goalRes.json()]);
      setEntries(entryJson.data ?? []);
      setGoal(goalJson.data ?? null);
    } catch {
      toast.error("Gagal memuat data spiritual");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal — fetch langsung di effect (setState hanya setelah await)
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/spiritual/entries"), fetch("/api/spiritual/goals")])
      .then(([entryRes, goalRes]) => Promise.all([entryRes.json(), goalRes.json()]))
      .then(([entryJson, goalJson]) => {
        if (cancelled) return;
        setEntries(entryJson.data ?? []);
        setGoal(goalJson.data ?? null);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat data spiritual");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Komputasi stats di client — murni data item (client-safe)
  const stats = React.useMemo(() => {
    return computeSpiritualStats(entries);
  }, [entries]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayEntry = entries.find((e) => e.date === todayStr) ?? null;

  const handleChanged = () => {
    void loadAll();
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SpiritualInsightPanel refreshKey={refreshKey} />

      <RitualForm
        key={todayEntry?.date ?? "baru"}
        todayEntry={todayEntry}
        stats={stats}
        onSaved={handleChanged}
      />

      <SpiritualGoalsPanel goal={goal} onChanged={handleChanged} />

      <SpiritualHistory entries={entries} onChanged={handleChanged} />
    </div>
  );
}
