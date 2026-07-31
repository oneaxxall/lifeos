"use client";

import * as React from "react";
import { Bed, Dumbbell, Footprints, Scale, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface HealthGoalItem {
  id: number;
  goalWeightKg: number;
  exercisePerWeekMinutes: number;
  sleepTargetHours: number;
  dailyStepsTarget: number;
}

interface Props {
  goal: HealthGoalItem | null;
  /** Statistik minggu ini utk progress bar */
  weeklyExercise: number;
  avgSleep: number;
  avgSteps: number;
  latestWeight: number;
  onChanged: () => void;
}

/** Target kesehatan + progress (HLT-03). */
export function HealthGoals({ goal, weeklyExercise, avgSleep, avgSteps, latestWeight, onChanged }: Props) {
  const [editing, setEditing] = React.useState(false);
  const [w, setW] = React.useState(goal?.goalWeightKg ? String(goal.goalWeightKg) : "");
  const [e, setE] = React.useState(goal?.exercisePerWeekMinutes ? String(goal.exercisePerWeekMinutes) : "");
  const [s, setS] = React.useState(goal?.sleepTargetHours ? String(goal.sleepTargetHours) : "");
  const [st, setSt] = React.useState(goal?.dailyStepsTarget ? String(goal.dailyStepsTarget) : "");

  const save = async () => {
    try {
      const res = await fetch("/api/health/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalWeightKg: w ? Number(w) : 0,
          exercisePerWeekMinutes: e ? Number(e) : 0,
          sleepTargetHours: s ? Number(s) : 0,
          dailyStepsTarget: st ? Number(st) : 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Target kesehatan disimpan 🎯");
      setEditing(false);
      onChanged();
    } catch {
      toast.error("Gagal menyimpan target");
    }
  };

  const hasGoal = goal && (goal.goalWeightKg || goal.exercisePerWeekMinutes || goal.sleepTargetHours || goal.dailyStepsTarget);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Target className="size-4 text-emerald-600 dark:text-emerald-400" /> Target kesehatan
        </p>
        <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={() => setEditing((v) => !v)}>
          {editing ? "Batal" : hasGoal ? "Edit target" : "Atur target"}
        </Button>
      </div>

      {editing ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">Berat ideal (kg)</p>
            <Input type="number" step="0.1" placeholder="70" value={w} onChange={(e) => setW(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">Olahraga/minggu (menit)</p>
            <Input type="number" placeholder="150" value={e} onChange={(e) => setE(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">Tidur (jam)</p>
            <Input type="number" step="0.5" placeholder="7.5" value={s} onChange={(e) => setS(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">Langkah/hari</p>
            <Input type="number" placeholder="8000" value={st} onChange={(e) => setSt(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="sm:col-span-4">
            <Button onClick={() => void save()} className="w-full sm:w-auto">
              Simpan target
            </Button>
          </div>
        </div>
      ) : !hasGoal ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Atur target untuk melihat progress — klik &quot;Atur target&quot;.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goal?.goalWeightKg ? (
            <GoalRow
              icon={<Scale className="size-3.5" />}
              label="Berat"
              current={latestWeight || 0}
              target={goal.goalWeightKg}
              suffix=" kg"
              invert
            />
          ) : null}
          {goal?.exercisePerWeekMinutes ? (
            <GoalRow
              icon={<Dumbbell className="size-3.5" />}
              label="Olahraga / minggu"
              current={weeklyExercise}
              target={goal.exercisePerWeekMinutes}
              suffix=" menit"
            />
          ) : null}
          {goal?.sleepTargetHours ? (
            <GoalRow
              icon={<Bed className="size-3.5" />}
              label="Tidur rata-rata"
              current={avgSleep}
              target={goal.sleepTargetHours}
              suffix=" jam"
            />
          ) : null}
          {goal?.dailyStepsTarget ? (
            <GoalRow
              icon={<Footprints className="size-3.5" />}
              label="Langkah / hari"
              current={avgSteps}
              target={goal.dailyStepsTarget}
              suffix=""
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function GoalRow({
  icon,
  label,
  current,
  target,
  suffix,
  invert = false,
}: {
  icon: React.ReactNode;
  label: string;
  current: number;
  target: number;
  suffix: string;
  invert?: boolean;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const reached = invert ? current > 0 && current <= target : pct >= 100;

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          {icon} {label}
        </span>
        <span className="tabular-nums">
          {current > 0 ? current : "—"}
          {current > 0 ? suffix : ""} / {target}{suffix}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            reached ? "bg-emerald-500" : pct >= 80 ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {reached ? "✅ Target tercapai" : `${pct}% tercapai`}
      </p>
    </div>
  );
}
