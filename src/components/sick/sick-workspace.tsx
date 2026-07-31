"use client";

import * as React from "react";
import { toast } from "sonner";
import { SickForm } from "@/components/sick/sick-form";
import { SickList, type SickItem } from "@/components/sick/sick-list";

/** Orchestrator Sick — state, fetch, compose komponen. */
export function SickWorkspace() {
  const [items, setItems] = React.useState<SickItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadAll = React.useCallback(async () => {
    try {
      const res = await fetch("/api/sick");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast.error("Gagal memuat riwayat");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal — fetch langsung di effect (setState hanya setelah await)
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/sick")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setItems(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat riwayat");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      <SickForm onSaved={() => void loadAll()} />
      <SickList items={items} onChanged={() => void loadAll()} />
    </div>
  );
}
