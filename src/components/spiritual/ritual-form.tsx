"use client";

import * as React from "react";
import { Check, Flame, MoonStar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SPIRITUAL_RITUALS } from "@/lib/db/schema";
import type { SpiritualStats } from "@/lib/db/spiritual-repo";

export interface SpiritualEntryItem {
  id: number;
  date: string;
  rituals: string;
  quality: number;
  reflection: string;
}

interface Props {
  todayEntry: SpiritualEntryItem | null;
  stats: SpiritualStats;
  onSaved: () => void;
}

/** Checklist ritual harian + kualitas + refleksi singkat (SPI-01). Upsert per tanggal.
 *  State diinisialisasi dari props — parent meng-remount via key saat todayEntry berubah. */
export function RitualForm({ todayEntry, stats, onSaved }: Props) {
  const [rituals, setRituals] = React.useState<Record<string, boolean>>(() => {
    if (todayEntry) {
      try {
        return JSON.parse(todayEntry.rituals);
      } catch {
        return {};
      }
    }
    return {};
  });
  const [quality, setQuality] = React.useState(todayEntry?.quality ?? 0);
  const [reflection, setReflection] = React.useState(todayEntry?.reflection ?? "");
  const [saving, setSaving] = React.useState(false);

  const toggle = (key: string) => {
    setRituals((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/spiritual/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rituals,
          quality: quality || undefined,
          reflection: reflection.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ritual hari ini tersimpan 🌙");
      onSaved();
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const doneCount = Object.values(rituals).filter(Boolean).length;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <MoonStar className="size-4 text-indigo-500" /> Ritual hari ini
        </p>
        <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <Flame className="size-3" /> Streak {stats.streak} hari
        </span>
        <Badge done={doneCount} total={SPIRITUAL_RITUALS.length} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {SPIRITUAL_RITUALS.map((r) => {
          const active = !!rituals[r.key];
          return (
            <button
              key={r.key}
              onClick={() => toggle(r.key)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all",
                active
                  ? "border-indigo-500/50 bg-indigo-500/10 shadow-sm"
                  : "border-border hover:border-indigo-400/40 hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-md border transition-colors",
                  active ? "border-indigo-500 bg-indigo-500 text-white" : "border-border"
                )}
              >
                {active && <Check className="size-3.5" />}
              </span>
              <span className="text-base">{r.icon}</span>
              <span className={cn("font-medium", !active && "text-muted-foreground")}>{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* Kualitas + refleksi */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            Kualitas ibadah hari ini (opsional)
          </p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => setQuality(v)}
                title={`${v}/5`}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg border text-sm transition-all",
                  quality >= v
                    ? "border-indigo-500 bg-indigo-500/15 font-bold text-indigo-600 dark:text-indigo-300"
                    : "border-border text-muted-foreground hover:border-indigo-400/40"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">Refleksi singkat (opsional)</p>
          <Textarea
            placeholder="mis. Hari ini terasa khusyuk saat Subuh…"
            rows={3}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            className="resize-none text-sm"
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button onClick={() => void save()} disabled={saving} className="gap-2">
          <MoonStar className="size-4" /> {saving ? "Menyimpan…" : "Simpan ritual"}
        </Button>
      </div>
    </div>
  );
}

function Badge({ done, total }: { done: number; total: number }) {
  return (
    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {done}/{total} ritual
    </span>
  );
}