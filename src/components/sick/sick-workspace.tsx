"use client";

import * as React from "react";
import { ChevronDown, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { SickForm } from "@/components/sick/sick-form";
import { SickList, type SickItem } from "@/components/sick/sick-list";
import { cn } from "@/lib/utils";

/** Orchestrator Sick — state, fetch, compose komponen. */
export function SickWorkspace() {
  const [items, setItems] = React.useState<SickItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);

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
      {/* ── Toggle form catat — default tertutup ── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <button
          onClick={() => setFormOpen((o) => !o)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/20"
          aria-expanded={formOpen}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
            <Stethoscope className="size-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Catat tidak enak badan</span>
            <span className="block text-[11px] text-muted-foreground">
              Analisa AI sebagai dukungan umum — bukan diagnosis 💙
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              formOpen && "rotate-180"
            )}
          />
        </button>
        {formOpen && (
          <div className="border-t border-border/60">
            <SickForm onSaved={() => void loadAll()} />
          </div>
        )}
      </div>

      <SickList items={items} onChanged={() => void loadAll()} />
    </div>
  );
}
