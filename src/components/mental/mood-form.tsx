"use client";

import * as React from "react";
import { Brain, Loader2, SmilePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const MOOD_OPTIONS = [
  { value: 1, emoji: "😞", label: "Sangat buruk", color: "text-red-500" },
  { value: 2, emoji: "😕", label: "Buruk", color: "text-orange-500" },
  { value: 3, emoji: "😐", label: "Netral", color: "text-amber-500" },
  { value: 4, emoji: "🙂", label: "Baik", color: "text-lime-500" },
  { value: 5, emoji: "😄", label: "Sangat baik", color: "text-emerald-500" },
];

/** Ukuran kotak berjenjang — makin tinggi mood, makin besar (ekspresif) */
export const MOOD_SIZE = {
  1: { box: "px-3 py-2.5", emoji: "text-xl", label: "text-[9px]" },
  2: { box: "px-3.5 py-3", emoji: "text-2xl", label: "text-[9px]" },
  3: { box: "px-4 py-3.5", emoji: "text-3xl", label: "text-[10px]" },
  4: { box: "px-4.5 py-4", emoji: "text-3xl", label: "text-[10px]" },
  5: { box: "px-5 py-4.5", emoji: "text-4xl", label: "text-[10px]" },
} as const;

interface Props {
  onSaved: () => void;
}

/** Mood (MEN-01) — pilih emoji, isi catatan, lalu simpan (mood + catatan terkirim bersama). */
export function MoodForm({ onSaved }: Props) {
  const [selected, setSelected] = React.useState<number | null>(null);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (selected === null) {
      toast.error("Pilih dulu mood-mu hari ini");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/mental/moods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: selected, note }),
      });
      if (!res.ok) throw new Error();
      const label = MOOD_OPTIONS.find((m) => m.value === selected)?.label ?? "";
      toast.success(`Mood "${label}" dicatat`);
      setSelected(null);
      setNote("");
      onSaved();
    } catch {
      toast.error("Gagal menyimpan mood");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Brain className="size-4 text-violet-600 dark:text-violet-400" />
        Bagaimana perasaanmu hari ini?
      </p>

      <div className="flex flex-wrap items-end gap-2">
        {MOOD_OPTIONS.map((m) => {
          const size = MOOD_SIZE[m.value as keyof typeof MOOD_SIZE];
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => setSelected(m.value)}
              disabled={saving}
              aria-label={`Mood ${m.label}`}
              aria-pressed={selected === m.value}
              title={m.label}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border transition-all",
                size.box,
                selected === m.value
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30 scale-105"
                  : "border-border hover:border-primary/40 hover:bg-muted/40 hover:-translate-y-0.5"
              )}
            >
              <span className={size.emoji}>{m.emoji}</span>
              <span className={cn("font-medium text-muted-foreground", size.label)}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          placeholder="Catatan singkat (opsional) — mis. rapat lancar, kurang tidur…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && selected !== null && !saving) {
              void save();
            }
          }}
          className="h-9 text-sm"
        />
        <Button
          onClick={() => void save()}
          disabled={saving || selected === null}
          className="h-9 shrink-0 gap-1.5"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SmilePlus className="size-4" />
          )}
          Simpan
        </Button>
      </div>
    </div>
  );
}
