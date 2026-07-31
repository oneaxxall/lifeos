"use client";

import * as React from "react";
import { toast } from "sonner";
import { FamilyForm } from "@/components/family/family-form";
import { FamilyList, type FamilyItem } from "@/components/family/family-list";

/** Orchestrator Family — state, fetch, compose komponen. */
export function FamilyWorkspace() {
  const [items, setItems] = React.useState<FamilyItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadAll = React.useCallback(async () => {
    try {
      const res = await fetch("/api/family");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast.error("Gagal memuat riwayat curhat");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal — fetch langsung di effect (setState hanya setelah await)
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/family")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setItems(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat riwayat curhat");
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
      <FamilyForm onSaved={() => void loadAll()} />
      <FamilyList items={items} onChanged={() => void loadAll()} />
    </div>
  );
}
