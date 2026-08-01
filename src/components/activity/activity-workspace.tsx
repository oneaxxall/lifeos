"use client";

import * as React from "react";
import { Loader2, NotebookPen } from "lucide-react";
import { ActivityManualForm, type ActivityCategoryOption } from "@/components/time/activity-manual-form";
import { ActivityList, type ActivityItem } from "@/components/time/activity-list";
import { ActivitySummary } from "@/components/activity/activity-summary";
import {
  ActivityFilterBar,
  applyActivityFilters,
  DEFAULT_ACTIVITY_FILTERS,
  type ActivityFilters,
} from "@/components/activity/activity-filter";

/** Halaman Activity — pencatatan aktivitas manual + ringkasan + filter riwayat. */
export function ActivityWorkspace() {
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [categories, setCategories] = React.useState<ActivityCategoryOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [filters, setFilters] = React.useState<ActivityFilters>(DEFAULT_ACTIVITY_FILTERS);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/time/activities");
        const json = await res.json();
        if (cancelled) return;
        setActivities(json.data ?? []);
        setCategories(json.categories ?? []);
      } catch {
        // biarkan kosong
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleChanged = () => setRefreshKey((k) => k + 1);

  const filtered = applyActivityFilters(activities, filters);

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <NotebookPen className="size-6 text-indigo-500" /> Activity
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catat aktivitas yang sudah terjadi — bangun tidur, makan, meeting, apapun — dengan waktu,
          kategori & tags.
        </p>
      </header>

      {/* Dashboard sederhana */}
      {!loading && <ActivitySummary activities={activities} />}

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Loader2 className="size-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
          {/* Form pencatatan manual */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ActivityManualForm categories={categories} onSaved={handleChanged} />
          </div>

          {/* Riwayat + filter */}
          <div className="space-y-3">
            <ActivityFilterBar
              filters={filters}
              onChange={setFilters}
              categories={categories}
              visibleCount={filtered.length}
              totalCount={activities.length}
            />
            <ActivityList activities={filtered} onChanged={handleChanged} />
          </div>
        </div>
      )}
    </div>
  );
}
