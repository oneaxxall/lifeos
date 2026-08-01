"use client";

import * as React from "react";
import { toast } from "sonner";
import { TimerBar, type ActivityCategoryOption, type RunningActivity } from "@/components/time/timer-bar";
import { TimeSummaryPanel, type TimeSummaryData } from "@/components/time/time-summary-panel";
import { ActivityList, type ActivityItem } from "@/components/time/activity-list";
import { TimeBlockPanel, type TimeBlockItem } from "@/components/time/time-block-panel";
import { TimeInsightPanel } from "@/components/time/time-insight-panel";
import { CategoryMenu, type CategoryMenuItem } from "@/components/ui/category-menu";
import { CategoryManagerDialog } from "@/components/ui/category-manager-dialog";

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
  const [categoryItems, setCategoryItems] = React.useState<CategoryMenuItem[]>([]);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [menuCategoryId, setMenuCategoryId] = React.useState<number | null>(null);

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
      setCategoryItems(catJson.data ?? []);
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
        setCategoryItems(catJson.data ?? []);
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        {/* Group menu kategori */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <CategoryMenu
            title="Kategori Aktivitas"
            items={categoryItems}
            activeId={menuCategoryId}
            onSelect={setMenuCategoryId}
            onManage={() => setManageOpen(true)}
          />
        </aside>

        {/* Konten utama */}
        <div className="min-w-0 space-y-5">
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

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TimeBlockPanel
              blocks={blocks}
              categories={categories}
              onChanged={() => void loadAll()}
            />
            <ActivityList
              activities={activities}
              menuCategoryId={menuCategoryId}
              onChanged={() => void loadAll()}
            />
          </div>
        </div>
      </div>

      <CategoryManagerDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        title="Kelola kategori aktivitas"
        baseUrl="/api/time/categories"
        items={categoryItems}
        onChanged={() => void loadAll()}
      />
    </div>
  );
}
