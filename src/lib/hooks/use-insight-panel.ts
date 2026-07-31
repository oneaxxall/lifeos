"use client";

import * as React from "react";

export type InsightSource = "ai" | "heuristik" | "kosong" | null;

export interface InsightPanelResult<T> {
  data: T | null;
  source: InsightSource;
  /** Derived: sedang fetch pertama (panel terbuka & belum pernah dimuat) */
  loading: boolean;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  /** true jika sudah pernah fetch (untuk membedakan "belum dibuka" vs "kosong") */
  fetched: boolean;
  /** Muat ulang manual (tombol refresh) */
  reload: () => void;
}

/**
 * Hook panel insight AI dengan LAZY FETCH:
 * - TIDAK memanggil AI saat halaman dibuka (panel collapsed).
 * - Fetch pertama kali terjadi saat user membuka panel (expand).
 * - Fetch ulang hanya saat refreshKey berubah (data di DB berubah) atau reload() manual.
 * - Buka-tutup panel TIDAK memicu fetch ulang (pakai data yang sudah ada).
 *
 * Ini menghemat panggilan LLM: membuka menu ≠ biaya AI.
 * loading bersifat derived (tanpa setState sinkron di effect — lolos lint).
 */
export function useInsightPanel<T>(
  endpoint: string,
  refreshKey: number,
  defaultCollapsed = true
): InsightPanelResult<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [source, setSource] = React.useState<InsightSource>(null);
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const [fetched, setFetched] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  // Kombinasi trigger terakhir yang sudah di-fetch (hindari refetch saat buka-tutup)
  const lastFetchRef = React.useRef<{ key: number; tick: number } | null>(null);

  // Lazy: fetch hanya jika panel terbuka & kombinasi trigger belum pernah di-fetch.
  React.useEffect(() => {
    if (collapsed) return; // panel tertutup → jangan panggil AI
    const trigger = { key: refreshKey, tick };
    if (lastFetchRef.current && lastFetchRef.current.key === trigger.key && lastFetchRef.current.tick === trigger.tick) {
      return; // sudah dimuat untuk trigger ini (buka-tutup tidak refetch)
    }
    lastFetchRef.current = trigger;
    let cancelled = false;
    fetch(endpoint, { method: "POST" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.ok) {
          setData(json.data ?? null);
          setSource(json.source ?? null);
        }
        setFetched(true);
      })
      .catch(() => {
        if (!cancelled) setFetched(true);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, collapsed, refreshKey, tick]);

  const reload = React.useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  // Loading = sedang fetch pertama (panel terbuka & belum selesai dimuat).
  // Fetch ulang (refreshKey/reload) tidak menampilkan spinner penuh — data lama tetap tampil.
  const loading = !collapsed && !fetched;

  return { data, source, loading, collapsed, setCollapsed, fetched, reload };
}
