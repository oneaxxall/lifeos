"use client";

import * as React from "react";
import { toast } from "sonner";
import { MoodForm } from "@/components/mental/mood-form";
import { MoodTrends, type MoodItem } from "@/components/mental/mood-trends";
import { JournalPanel, type JournalItem } from "@/components/mental/journal-panel";
import { MentalInsightPanel } from "@/components/mental/mental-insight-panel";

/** Orchestrator Mental Health — state, fetch, compose komponen. */
export function MentalWorkspace() {
  const [moods, setMoods] = React.useState<MoodItem[]>([]);
  const [journals, setJournals] = React.useState<JournalItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const loadAll = React.useCallback(async () => {
    try {
      const [moodRes, journalRes] = await Promise.all([
        fetch("/api/mental/moods"),
        fetch("/api/mental/journals"),
      ]);
      const [moodJson, journalJson] = await Promise.all([moodRes.json(), journalRes.json()]);
      setMoods(moodJson.data ?? []);
      setJournals(journalJson.data ?? []);
    } catch {
      toast.error("Gagal memuat data mental health");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal — fetch langsung di effect (setState hanya setelah await)
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/mental/moods"), fetch("/api/mental/journals")])
      .then(([moodRes, journalRes]) => Promise.all([moodRes.json(), journalRes.json()]))
      .then(([moodJson, journalJson]) => {
        if (cancelled) return;
        setMoods(moodJson.data ?? []);
        setJournals(journalJson.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat data mental health");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      <MentalInsightPanel refreshKey={refreshKey} />

      <MoodForm onSaved={handleChanged} />

      <div className="grid gap-4 xl:grid-cols-2">
        <JournalPanel journals={journals} onChanged={handleChanged} />
        <MoodTrends moods={moods} onChanged={handleChanged} />
      </div>
    </div>
  );
}
