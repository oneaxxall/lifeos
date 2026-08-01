"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CheckCircle2, Coffee, Flame, History, Loader2, Timer as TimerIcon, Trophy } from "lucide-react";
import { PomodoroTimer } from "@/components/pomodoro/pomodoro-timer";

interface Session {
  id: number;
  date: string;
  durationMinutes: number;
  cycle: number;
  task: string;
  completed: boolean;
  createdAt: string;
}

interface PomodoroData {
  todayFocus: number;
  todayCount: number;
  totalFocus: number;
  totalCount: number;
  cycle: number;
  sessions: Session[];
}

/** Halaman Pomodoro — timer + statistik + riwayat sesi hari ini. */
export function PomodoroWorkspace() {
  const [data, setData] = React.useState<PomodoroData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/pomodoro");
        const json = await res.json();
        if (!cancelled) setData(json.data ?? null);
      } catch {
        // biarkan kosong
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleDone = () => setRefreshKey((k) => k + 1);

  const fmtMin = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} mnt`;
    return m ? `${h}j ${m}m` : `${h} jam`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <TimerIcon className="size-6 text-primary" /> Pomodoro
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Teknik fokus 25/5 — setiap sesi selesai otomatis tercatat sebagai aktivitas produktif.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Loader2 className="size-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat…</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          {/* Timer */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <PomodoroTimer nextCycle={data?.cycle ?? 1} onSessionDone={handleDone} />
          </div>

          <div className="space-y-5">
            {/* Statistik */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
                <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Flame className="size-3 text-amber-500" /> Hari ini
                </p>
                <p className="mt-1 text-2xl font-bold leading-none">{data?.todayCount ?? 0}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">sesi fokus</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
                <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <TimerIcon className="size-3 text-primary" /> Fokus hari ini
                </p>
                <p className="mt-1 text-2xl font-bold leading-none">{fmtMin(data?.todayFocus ?? 0)}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">total waktu</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
                <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Trophy className="size-3 text-amber-500" /> Total sesi
                </p>
                <p className="mt-1 text-2xl font-bold leading-none">{data?.totalCount ?? 0}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">semua waktu</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
                <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Coffee className="size-3 text-emerald-500" /> Sesi berikutnya
                </p>
                <p className="mt-1 text-2xl font-bold leading-none">#{data?.cycle ?? 1}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">siklus hari ini</p>
              </div>
            </div>

            {/* Riwayat sesi hari ini */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <History className="size-4 text-primary" /> Sesi hari ini
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({data?.sessions.filter((s) => s.completed).length ?? 0} selesai)
                </span>
              </p>

              {!data || data.sessions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Belum ada sesi — mulai timer di sebelah kiri! 🍅
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {data.sessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
                    >
                      <CheckCircle2 className={s.completed ? "size-4 shrink-0 text-emerald-500" : "size-4 shrink-0 text-muted-foreground/40"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {s.task ? `🍅 ${s.task}` : "Sesi fokus"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Sesi #{s.cycle} · {s.durationMinutes} menit ·{" "}
                          {format(new Date(s.createdAt.replace(" ", "T") + "Z"), "HH:mm", { locale: id })}
                        </p>
                      </div>
                      <span className={s.completed ? "text-[10px] font-medium text-emerald-500" : "text-[10px] text-muted-foreground"}>
                        {s.completed ? "✓ selesai" : "di-skip"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
