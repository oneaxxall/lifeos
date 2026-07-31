"use client";

import * as React from "react";
import { CalendarCheck2, Flame, Loader2, Sparkles } from "lucide-react";
import { HabitForm } from "@/components/habits/habit-form";
import { HabitCard, type HabitItem, type HabitStatsData } from "@/components/habits/habit-card";

interface HabitWithStats extends HabitItem {
  stats: HabitStatsData;
}

/** Workspace Bad Habit Tracker — ringkasan + daftar kebiasaan + check-in + panel AI. */
export function HabitsWorkspace() {
  const [habits, setHabits] = React.useState<HabitWithStats[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/habits");
        const json = await res.json();
        if (cancelled) return;
        const list = (json.data ?? []) as HabitItem[];
        const withStats = await Promise.all(
          list.map(async (h) => {
            const logsRes = await fetch(`/api/habits/logs?habitId=${h.id}`);
            const logsJson = await logsRes.json();
            const { computeHabitStats } = await import("@/lib/habit-stats");
            const stats = computeHabitStats(logsJson.data ?? []);
            return { ...h, stats };
          })
        );
        if (cancelled) return;
        setHabits(withStats.filter((h) => h.active));
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

  const handleChanged = () => setRefreshKey((k) => k + 1);

  const totalBersihHariIni = habits.filter((h) => h.todayLog?.status === "bersih").length;
  const totalKambuhHariIni = habits.filter((h) => h.todayLog?.status === "kambuh").length;
  const bestStreak = habits.reduce((m, h) => Math.max(m, h.stats.streak), 0);
  const totalKambuhMinggu = habits.reduce((a, h) => a + h.stats.kambuhMingguIni, 0);
  const donePct = habits.length > 0 ? Math.round((totalBersihHariIni / habits.length) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* ===== Header ringkasan ===== */}
      <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Flame className="size-4 text-amber-500" />
              Perjuanganmu hari ini
            </p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              {habits.length === 0
                ? "Daftarkan kebiasaan pertama untuk mulai melacak."
                : donePct === 100
                  ? "Semua kebiasaan hari ini bersih — luar biasa! 🎉"
                  : donePct >= 50
                    ? `Sudah ${totalBersihHariIni} dari ${habits.length} kebiasaan bersih hari ini — lanjutkan! 💪`
                    : `Baru ${totalBersihHariIni} dari ${habits.length} kebiasaan yang dicatat hari ini.`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold leading-none text-emerald-500">{totalBersihHariIni}</p>
              <p className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground">bersih hari ini</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold leading-none text-rose-500">{totalKambuhHariIni}</p>
              <p className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground">kambuh</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold leading-none text-amber-500">{bestStreak}</p>
              <p className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground">streak terbaik</p>
            </div>
            <div className="hidden text-center sm:block">
              <p className="text-2xl font-bold leading-none">{totalKambuhMinggu}</p>
              <p className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground">kambuh mgg ini</p>
            </div>
          </div>
        </div>

        {/* Progress bar keseluruhan hari ini */}
        {habits.length > 0 && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                style={{ width: `${donePct}%` }}
              />
            </div>
            <p className="mt-1.5 text-right text-[10px] text-muted-foreground">
              <Sparkles className="mr-1 inline size-3 align-[-2px]" />
              {donePct}% kebiasaan hari ini sudah dicatat
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* Form baru */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <HabitForm onSaved={handleChanged} />
          <div className="hidden rounded-xl border border-border/60 bg-card/50 p-4 lg:block">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <CalendarCheck2 className="size-3.5 text-primary" /> Tips rutin
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Check-in tiap malam sebelum tidur — 5 detik saja. Konsistensi mencatat lebih penting
              daripada hasil hari itu. 📝
            </p>
          </div>
        </div>

        {/* Daftar kebiasaan — 2 kolom */}
        <div>
          {loading ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <Loader2 className="size-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Memuat kebiasaan…</p>
            </div>
          ) : habits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
              <p className="text-4xl">🌱</p>
              <p className="mt-3 text-sm font-semibold">Belum ada kebiasaan yang dilacak</p>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Daftarkan satu kebiasaan buruk yang ingin dikurangi — mulai dari yang paling
                mengganggu. Target kecil, alasan jelas, dan check-in tiap hari.
              </p>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                <Flame className="size-3" /> Mulai dari kiri — form daftar kebiasaan
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {habits.map((h) => (
                <HabitCard key={h.id} habit={h} stats={h.stats} onChanged={handleChanged} refreshKey={refreshKey} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
