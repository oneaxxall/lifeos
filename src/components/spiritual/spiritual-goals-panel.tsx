"use client";

import * as React from "react";
import { BookOpen, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface SpiritualGoalItem {
  id: number;
  quranKhatamJuz: number;
  weeklyReadMinutes: number;
}

interface Props {
  goal: SpiritualGoalItem | null;
  onChanged: () => void;
}

/** Target spiritual (khatam Quran, baca/minggu) + progress (SPI-04). */
export function SpiritualGoalsPanel({ goal, onChanged }: Props) {
  const [editing, setEditing] = React.useState(false);
  const [juz, setJuz] = React.useState(goal?.quranKhatamJuz ? String(goal.quranKhatamJuz) : "");
  const [min, setMin] = React.useState(goal?.weeklyReadMinutes ? String(goal.weeklyReadMinutes) : "");

  const save = async () => {
    try {
      const res = await fetch("/api/spiritual/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quranKhatamJuz: juz ? Number(juz) : 0,
          weeklyReadMinutes: min ? Number(min) : 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Target spiritual tersimpan 🎯");
      setEditing(false);
      onChanged();
    } catch {
      toast.error("Gagal menyimpan target");
    }
  };

  const hasGoal = goal && (goal.quranKhatamJuz || goal.weeklyReadMinutes);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Target className="size-4 text-indigo-500" /> Target spiritual
        </p>
        <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={() => setEditing((v) => !v)}>
          {editing ? "Batal" : hasGoal ? "Edit target" : "Atur target"}
        </Button>
      </div>

      {editing ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">Target khatam Quran (juz)</p>
            <Input type="number" min={1} max={30} placeholder="30" value={juz} onChange={(e) => setJuz(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">Baca Quran per minggu (menit)</p>
            <Input type="number" min={1} placeholder="60" value={min} onChange={(e) => setMin(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => void save()} className="w-full sm:w-auto">
              Simpan target
            </Button>
          </div>
        </div>
      ) : !hasGoal ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Atur target khatam Quran atau target baca mingguan.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {goal?.quranKhatamJuz ? (
            <div className="rounded-lg border border-border/60 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                <BookOpen className="size-3.5 text-indigo-500" /> Khatam Quran
              </p>
              <p className="text-sm font-semibold tabular-nums">
                Target {goal.quranKhatamJuz} juz
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                ≈ {Math.ceil((goal.quranKhatamJuz || 0) / 30)} juz/hari untuk sebulan
              </p>
            </div>
          ) : null}
          {goal?.weeklyReadMinutes ? (
            <div className="rounded-lg border border-border/60 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                <BookOpen className="size-3.5 text-indigo-500" /> Baca mingguan
              </p>
              <p className="text-sm font-semibold tabular-nums">
                {goal.weeklyReadMinutes} menit/minggu
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                ≈ {Math.ceil(goal.weeklyReadMinutes / 7)} menit/hari
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
