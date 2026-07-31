import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activities,
  businessIdeas,
  businessProjects,
  contacts,
  financeTransactions,
  healthEntries,
  moodEntries,
  sickEntries,
  spiritualEntries,
  teamMembers,
  teamOneOnOnes,
  todos,
} from "@/lib/db/schema";
import { computeSpiritualStats } from "@/lib/spiritual-stats";

/** Konteks ringkas (≤3 baris per fitur) — cukup untuk AI. */
function compact<T>(items: T[], n: number): T[] {
  return items.slice(0, n);
}

/** Kumpulkan snapshot data lintas fitur untuk konteks AI. */
export function buildLifeSnapshot() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

  /* Todo */
  const allTodos = db.select().from(todos).orderBy(desc(todos.createdAt)).all();
  const todosDueToday = allTodos.filter((t) => t.dueDate === today && t.status !== "done");
  const todosOverdue = allTodos.filter((t) => t.dueDate && t.dueDate < today && t.status !== "done");
  const todosDoneWeek = allTodos.filter((t) => t.completedAt && t.completedAt.slice(0, 10) >= weekAgo);
  const todosBacklog = allTodos.filter((t) => t.status === "backlog" || t.status === "todo").length;
  const spends = db
    .select()
    .from(financeTransactions)
    .where(eq(financeTransactions.type, "keluar"))
    .all()
    .filter((f) => f.date >= monthAgo);
  const incomes = db
    .select()
    .from(financeTransactions)
    .where(eq(financeTransactions.type, "masuk"))
    .all()
    .filter((f) => f.date >= monthAgo);
  const spendTotal = spends.reduce((s, f) => s + f.amount, 0);
  const incomeTotal = incomes.reduce((s, f) => s + f.amount, 0);

  /* Health */
  const health = db.select().from(healthEntries).orderBy(desc(healthEntries.date)).limit(7).all();
  const avgSleep =
    health.filter((h) => h.sleepHours).reduce((s, h) => s + (h.sleepHours || 0), 0) /
    Math.max(1, health.filter((h) => h.sleepHours).length);

  /* Time */
  const timeActivities = db.select().from(activities).orderBy(desc(activities.createdAt)).all();
  const weekActivities = timeActivities.filter((a) => {
    const d = a.startedAt?.slice(0, 10) ?? "";
    return d >= weekAgo;
  });
  const weekMinutes = weekActivities.reduce((s, a) => s + (a.durationMinutes || 0), 0);

  /* Mental */
  const moods = db.select().from(moodEntries).orderBy(desc(moodEntries.date)).limit(7).all();
  const avgMood =
    moods.reduce((s, m) => s + m.mood, 0) / Math.max(1, moods.length);

  /* Spiritual */
  const spiritual = db
    .select()
    .from(spiritualEntries)
    .orderBy(asc(spiritualEntries.date))
    .all()
    .map((e) => ({ date: e.date, rituals: e.rituals }));
  const spiritualStats = computeSpiritualStats(spiritual);

  /* Sick */
  const sickCount = db.select().from(sickEntries).all().filter((s) => s.date >= weekAgo).length;

  /* Business */
  const projects = db.select().from(businessProjects).where(eq(businessProjects.active, true)).all();
  const ideas = db.select().from(businessIdeas).orderBy(desc(businessIdeas.createdAt)).limit(5).all();

  /* Networking */
  const allContacts = db.select().from(contacts).all();
  const coldContacts = allContacts.filter((c) => {
    if (!c.lastContact) return true;
    return (Date.now() - new Date(c.lastContact + "T00:00:00").getTime()) / 86400000 > 90;
  });

  /* Team */
  const members = db.select().from(teamMembers).all().length;
  const onones = db.select().from(teamOneOnOnes).all().length;

  return {
    today,
    weekAgo,
    monthAgo,
    todos: {
      dueToday: todosDueToday.map((t) => t.title),
      overdue: todosOverdue.map((t) => t.title),
      doneWeek: todosDoneWeek.length,
      backlog: todosBacklog,
    },
    finance: {
      spendTotal,
      incomeTotal,
      spendsThisMonth: spends.length,
      topSpendCategories: topSpendCategories(spends),
    },
    health: {
      entriesWeek: health.length,
      avgSleep: avgSleep ? avgSleep.toFixed(1) : "0",
      latestWeight: health.find((h) => h.weightKg)?.weightKg ?? 0,
    },
    time: {
      weekMinutes,
      weekActivities: weekActivities.length,
    },
    mental: {
      avgMood: avgMood ? avgMood.toFixed(1) : "0",
      moodEntries: moods.length,
    },
    spiritual: {
      streak: spiritualStats.streak,
      weekCompletion: spiritualStats.weekCompletion,
    },
    sick: { thisWeek: sickCount },
    business: {
      activeProjects: projects.map((p) => p.name),
      ideas: ideas.map((i) => i.title),
    },
    networking: {
      contacts: allContacts.length,
      cold: coldContacts.length,
    },
    team: { members: members, onones },
  };
}

function topSpendCategories(spends: { categoryId: number | null }[]): string[] {
  const counts: Record<number, number> = {};
  for (const s of spends) {
    if (s.categoryId) counts[s.categoryId] = (counts[s.categoryId] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => `kategori#${id} (${counts[Number(id)]}x)`);
}

/** Snapshot → teks ringkas untuk prompt AI */
export function snapshotToText(s: ReturnType<typeof buildLifeSnapshot>): string {
  return [
    `📋 TODO:`,
    `  Deadline hari ini: ${s.todos.dueToday.length ? s.todos.dueToday.join("; ") : "tidak ada"}`,
    `  Terlambat: ${s.todos.overdue.length ? s.todos.overdue.join("; ") : "tidak ada"}`,
    `  Selesai 7 hari: ${s.todos.doneWeek} | Antrian: ${s.todos.backlog}`,
    ``,
    `💰 FINANCE (30 hari):`,
    `  Keluar Rp${s.finance.spendTotal.toLocaleString("id-ID")} (${s.finance.spendsThisMonth} transaksi) | Masuk Rp${s.finance.incomeTotal.toLocaleString("id-ID")}`,
    `  Kategori pengeluaran teratas: ${s.finance.topSpendCategories.join(", ") || "-"}`,
    ``,
    `🏥 HEALTH (7 hari):`,
    `  Entri: ${s.health.entriesWeek} | Tidur rata-rata ${s.health.avgSleep} jam | Berat: ${s.health.latestWeight}kg`,
    ``,
    `⏱ TIME (7 hari):`,
    `  ${s.time.weekMinutes} menit tercatat (${s.time.weekActivities} aktivitas)`,
    ``,
    `🧠 MENTAL (7 hari):`,
    `  Mood rata-rata ${s.mental.avgMood}/5 (${s.mental.moodEntries} entri)`,
    ``,
    `🕌 SPIRITUAL:`,
    `  Streak ${s.spiritual.streak} hari | Komplesi 7 hari ${s.spiritual.weekCompletion}%`,
    ``,
    `🤒 SICK: ${s.sick.thisWeek} catatan minggu ini`,
    ``,
    `💼 BUSINESS:`,
    `  Proyek aktif: ${s.business.activeProjects.join("; ") || "-"}`,
    `  Ide terbaru: ${s.business.ideas.join("; ") || "-"}`,
    ``,
    `🤝 NETWORKING: ${s.networking.contacts} kontak (${s.networking.cold} dingin >90 hari)`,
    ``,
    `👥 TEAM: ${s.team.members} anggota, ${s.team.onones} sesi 1-on-1`,
  ].join("\n");
}

export function buildLifeContext(): string {
  return snapshotToText(buildLifeSnapshot());
}

// Re-export util yang mungkin dibutuhkan modul lain
export { compact };
