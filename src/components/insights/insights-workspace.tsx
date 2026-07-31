"use client";

import * as React from "react";
import { toast } from "sonner";
import { DailyBriefPanel } from "@/components/insights/daily-brief-panel";
import { WeeklyReportPanel } from "@/components/insights/weekly-report-panel";
import { AskPanel } from "@/components/insights/ask-panel";
import { InsightFeed, type InsightItem } from "@/components/insights/insight-feed";

/** Orchestrator Insights — hub AI lintas fitur. */
export function InsightsWorkspace() {
  const [feed, setFeed] = React.useState<InsightItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const loadFeed = React.useCallback(async () => {
    try {
      const res = await fetch("/api/insights");
      const json = await res.json();
      setFeed(json.data ?? []);
    } catch {
      toast.error("Gagal memuat riwayat insight");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal — fetch langsung di effect (setState hanya setelah await)
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/insights")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setFeed(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat riwayat insight");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChanged = () => {
    void loadFeed();
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <DailyBriefPanel refreshKey={refreshKey} />
      <WeeklyReportPanel refreshKey={refreshKey} />
      <AskPanel />
      <InsightFeed items={feed} onChanged={handleChanged} />
    </div>
  );
}
