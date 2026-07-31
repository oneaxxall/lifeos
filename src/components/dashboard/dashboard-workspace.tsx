"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Activity as ActivityIcon,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CheckSquare,
  Flame,
  HeartPulse,
  History,
  Loader2,
  Smile,
  Sparkles,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuoteSlider } from "@/components/dashboard/quote-slider";

interface DashboardStats {
  activeTodos: number;
  overdueTodos: number;
  todayTodos: number;
  monthIncome: number;
  monthExpense: number;
  lastMood: { id: number; date: string; mood: number; note: string } | null;
  todayHealth: { id: number; sleepHours: number; exerciseMinutes: number; steps: number } | null;
  bestHabitStreak: number;
  habitCount: number;
}

interface ActivityItem {
  id: number;
  type: string;
  title: string;
  sub: string;
  date: string;
  ts: string;
}

interface DashboardData {
  stats: DashboardStats;
  recent: ActivityItem[];
}

const ACTIVITY_META: Record<string, { label: string; icon: string; color: string }> = {
  todo: { label: "Todo", icon: "✅", color: "text-sky-600 dark:text-sky-400" },
  finance: { label: "Keuangan", icon: "💰", color: "text-emerald-600 dark:text-emerald-400" },
  mood: { label: "Mental", icon: "🧠", color: "text-violet-600 dark:text-violet-400" },
  health: { label: "Health", icon: "❤️", color: "text-rose-500" },
  sick: { label: "Sick", icon: "🤒", color: "text-rose-500" },
  family: { label: "Family", icon: "👨‍👩‍👧", color: "text-pink-500" },
  habit: { label: "Bad Habit", icon: "🔥", color: "text-amber-500" },
  spiritual: { label: "Spiritual", icon: "🕌", color: "text-teal-600 dark:text-teal-400" },
  activity: { label: "Time", icon: "⏱️", color: "text-indigo-500" },
  knowledge: { label: "Knowledge", icon: "📚", color: "text-blue-500" },
};

function formatTimeAgo(ts: string): string {
  if (!ts) return "";
  const t = new Date(ts.replace(" ", "T") + "Z");
  if (isNaN(t.getTime())) return ts;
  const diff = Date.now() - t.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return format(t, "d MMM", { locale: id });
}

/** Beranda = Dashboard: statistik hari ini + recent activity lintas fitur. */
export function DashboardWorkspace() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard");
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
  }, []);

  const s = data?.stats;

  // Greeting dinamis sesuai waktu
  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? { text: "Selamat dini hari", emoji: "🌙" }
      : hour < 11
        ? { text: "Selamat pagi", emoji: "🌅" }
        : hour < 15
          ? { text: "Selamat siang", emoji: "☀️" }
          : hour < 19
            ? { text: "Selamat sore", emoji: "🌤️" }
            : { text: "Selamat malam", emoji: "🌙" };

  return (
    <div className="space-y-6">
      {/* ===== Greeting — paling atas ===== */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-amber-500/10 via-card to-primary/[0.08] px-6 py-6 shadow-sm">
        {/* dekorasi */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-6 select-none font-serif text-[120px] leading-none text-primary/10"
        >
          {greeting.emoji}
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute right-24 top-4 hidden h-10 w-10 rounded-full bg-amber-400/10 blur-xl sm:block"
        />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <span className="inline-block h-px w-6 bg-primary/40" />
              {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
            </p>
            <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
              {greeting.text} <span className="align-middle">{greeting.emoji}</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {s && s.overdueTodos > 0
                ? `Ada ${s.overdueTodos} tugas terlambat — mulai dari yang paling penting.`
                : s && s.todayTodos > 0
                  ? `${s.todayTodos} tugas menunggumu hari ini — kamu bisa!`
                  : "Second brain Anda siap — jadikan hari ini berarti."}
            </p>
          </div>

          <Link
            href="/insights"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Sparkles className="size-3.5" /> Insight AI hari ini
          </Link>
        </div>
      </header>

      {/* Quotes hari ini (slider) */}
      <QuoteSlider />

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Loader2 className="size-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Menyiapkan dashboard…</p>
        </div>
      ) : (
        <>
          {/* ===== Grid statistik ===== */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* Todo */}
            <Link
              href="/todo"
              className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Todo aktif</p>
                <CheckSquare className="size-3.5 text-sky-500" />
              </div>
              <p className="mt-1.5 text-2xl font-bold leading-none">{s?.activeTodos ?? 0}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {s && s.overdueTodos > 0 ? (
                  <span className="font-medium text-rose-500">{s.overdueTodos} terlambat!</span>
                ) : s && s.todayTodos > 0 ? (
                  <span className="font-medium text-amber-500">{s.todayTodos} jatuh tempo hari ini</span>
                ) : (
                  "Tidak ada yang terlambat 🎉"
                )}
              </p>
            </Link>

            {/* Finance */}
            <Link
              href="/finance"
              className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Keuangan bulan ini</p>
                <Wallet className="size-3.5 text-emerald-500" />
              </div>
              <p className="mt-1.5 text-2xl font-bold leading-none">
                Rp{((s?.monthExpense ?? 0) - (s?.monthIncome ?? 0) < 0 ? s?.monthIncome ?? 0 : s?.monthExpense ?? 0).toLocaleString("id-ID")}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                <ArrowUpRight className="size-3 text-emerald-500" />
                <span>Masuk Rp{(s?.monthIncome ?? 0).toLocaleString("id-ID")}</span>
                <ArrowDownRight className="ml-1 size-3 text-rose-500" />
                <span>Keluar Rp{(s?.monthExpense ?? 0).toLocaleString("id-ID")}</span>
              </p>
            </Link>

            {/* Mood */}
            <Link
              href="/mental"
              className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Mood terakhir</p>
                <Smile className="size-3.5 text-violet-500" />
              </div>
              <p className="mt-1.5 text-2xl font-bold leading-none">
                {s?.lastMood ? ["😞", "😕", "😐", "🙂", "😄"][Math.min(4, Math.max(0, s.lastMood.mood - 1))] : "—"}
              </p>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">
                {s?.lastMood
                  ? format(new Date(s.lastMood.date), "d MMM", { locale: id }) +
                    (s.lastMood.note ? ` · ${s.lastMood.note.slice(0, 20)}` : "")
                  : "Belum ada catatan mood"}
              </p>
            </Link>

            {/* Bad Habit */}
            <Link
              href="/habits"
              className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bad Habit</p>
                <Flame className="size-3.5 text-amber-500" />
              </div>
              <p className="mt-1.5 text-2xl font-bold leading-none">{s?.bestHabitStreak ?? 0}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {s && s.habitCount > 0 ? "hari bersih terbaik 🔥" : "Belum ada kebiasaan dilacak"}
              </p>
            </Link>
          </div>

          {/* ===== Health singkat + Quick action ===== */}
          <div className="grid gap-3 lg:grid-cols-3">
            {s?.todayHealth && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-1">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15">
                  <HeartPulse className="size-4.5 text-rose-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Health hari ini</p>
                  <p className="mt-0.5 truncate text-xs">
                    {[
                      s.todayHealth.sleepHours ? `Tidur ${s.todayHealth.sleepHours} jam` : "",
                      s.todayHealth.exerciseMinutes ? `Olahraga ${s.todayHealth.exerciseMinutes} mnt` : "",
                      s.todayHealth.steps ? `${s.todayHealth.steps.toLocaleString("id-ID")} langkah` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Belum dicatat"}
                  </p>
                </div>
              </div>
            )}

            {/* Quick action */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                <CalendarClock className="size-4.5 text-primary" />
              </div>
              <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Mulai hari ini:</span>{" "}
                {s && s.overdueTodos > 0
                  ? `Ada ${s.overdueTodos} tugas terlambat — selesaikan yang paling penting dulu.`
                  : s && s.todayTodos > 0
                    ? `${s.todayTodos} tugas jatuh tempo hari ini — cek daftar Todo.`
                    : "Tidak ada tugas mendesak. Luangkan 10 menit untuk refleksi di Insights."}
              </p>
              <Link
                href="/todo"
                className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Ke Todo
              </Link>
            </div>
          </div>

          {/* ===== Recent Activity ===== */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Aktivitas terbaru</h2>
              <span className="text-xs text-muted-foreground">(lintas semua fitur)</span>
            </div>

            {!data || data.recent.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
                <ActivityIcon className="mx-auto size-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm font-medium">Belum ada aktivitas</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mulai dengan mencatat todo, mood, atau aktivitas — semua akan muncul di sini.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
                <ul className="divide-y divide-border/60">
                  {data.recent.map((a) => {
                    const meta = ACTIVITY_META[a.type] ?? ACTIVITY_META.activity;
                    return (
                      <li key={`${a.type}-${a.id}`} className="flex items-center gap-3 px-2 py-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-base">
                          {meta.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-snug">{a.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {meta.label}
                            {a.sub ? ` · ${a.sub}` : ""}
                          </p>
                        </div>
                        <span className={cn("shrink-0 text-[10px] text-muted-foreground/70", meta.color)}>
                          {formatTimeAgo(a.ts)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
