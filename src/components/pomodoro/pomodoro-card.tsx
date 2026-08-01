"use client";

import * as React from "react";
import { Coffee, Loader2, Pause, PictureInPicture2, Play, RotateCcw, SkipForward, Timer as TimerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PomodoroCardProps {
  phase: "work" | "break";
  secondsLeft: number;
  totalSec: number;
  running: boolean;
  saving: boolean;
  task: string;
  workMin: number;
  breakMin: number;
  nextCycle: number;
  pipActive: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onTaskChange: (v: string) => void;
  onWorkMinChange: (v: number) => void;
  onBreakMinChange: (v: number) => void;
  onTogglePip: () => void;
}

/**
 * Kartu timer Pomodoro — PRESENTATIONAL (controlled).
 * Dipakai di halaman utama DAN di window Picture-in-Picture (createRoot),
 * sehingga tampilan & fungsi selalu identik.
 */
export function PomodoroCard({
  phase,
  secondsLeft,
  totalSec,
  running,
  saving,
  task,
  workMin,
  breakMin,
  nextCycle,
  pipActive,
  onStart,
  onPause,
  onReset,
  onSkip,
  onTaskChange,
  onWorkMinChange,
  onBreakMinChange,
  onTogglePip,
}: PomodoroCardProps) {
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const pct = totalSec > 0 ? (secondsLeft / totalSec) * 100 : 0;
  const isWork = phase === "work";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border p-5 shadow-sm transition-colors",
        isWork
          ? "border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card"
          : "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-card"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <TimerIcon className={cn("size-4", isWork ? "text-primary" : "text-emerald-500")} />
          Pomodoro
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
              isWork
                ? "bg-primary/15 text-primary"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            )}
          >
            {isWork ? "Fokus" : "Istirahat"}
          </span>
          {running && (
            <span className="flex items-center gap-1 text-[9px] font-normal text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" /> berjalan
            </span>
          )}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Sesi #{Math.max(1, nextCycle - 1)}</span>
        </div>
      </div>

      {/* Timer besar */}
      <div className="mt-4 text-center">
        <p
          className={cn(
            "font-mono text-5xl font-bold tabular-nums tracking-tight",
            isWork ? "text-primary" : "text-emerald-500"
          )}
        >
          {mm}:{ss}
        </p>
        <div className="mx-auto mt-3 h-1.5 max-w-[220px] overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isWork ? "bg-primary" : "bg-emerald-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Label tugas */}
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Label tugas (mis. Deep work — laporan Q3)"
            value={task}
            onChange={(e) => onTaskChange(e.target.value)}
            disabled={running}
            className="h-9 pl-8 text-sm"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">🍅</span>
        </div>
      </div>

      {/* Kontrol durasi */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">Fokus</span>
          <Input
            type="number"
            min={1}
            max={90}
            value={workMin}
            onChange={(e) => onWorkMinChange(Number(e.target.value))}
            disabled={running}
            className="h-8 w-16 text-center text-sm"
            aria-label="Durasi fokus (menit)"
          />
          <span className="text-[10px] text-muted-foreground">mnt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Coffee className="size-3.5 text-emerald-500" />
          <Input
            type="number"
            min={1}
            max={30}
            value={breakMin}
            onChange={(e) => onBreakMinChange(Number(e.target.value))}
            disabled={running}
            className="h-8 w-16 text-center text-sm"
            aria-label="Durasi istirahat (menit)"
          />
          <span className="text-[10px] text-muted-foreground">mnt</span>
        </div>
      </div>

      {/* Kontrol */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {!running ? (
          <Button onClick={onStart} disabled={saving} className="min-w-28 gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {saving ? "Menyimpan…" : secondsLeft === totalSec ? "Mulai" : "Lanjut"}
          </Button>
        ) : (
          <Button onClick={onPause} variant="outline" className="min-w-28 gap-2">
            <Pause className="size-4" /> Jeda
          </Button>
        )}
        <Button
          variant={pipActive ? "default" : "ghost"}
          size="icon"
          onClick={onTogglePip}
          aria-label={pipActive ? "Keluar Picture-in-Picture" : "Picture-in-Picture"}
          title={pipActive ? "Keluar PiP" : "Picture-in-Picture"}
        >
          <PictureInPicture2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onReset} disabled={running} aria-label="Reset timer">
          <RotateCcw className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSkip} aria-label="Lewati fase" title="Lewati fase">
          <SkipForward className="size-4" />
        </Button>
      </div>
    </div>
  );
}
