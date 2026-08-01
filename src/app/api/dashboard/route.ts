import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activities,
  badHabits,
  familyEntries,
  financeTransactions,
  habitLogs,
  healthEntries,
  knowledge,
  moodEntries,
  sickEntries,
  spiritualEntries,
  todos,
} from "@/lib/db/schema";
import { computeHabitStats } from "@/lib/habit-stats";

const DONE_STATUSES = ["selesai", "done"];

/** GET /api/dashboard — ringkasan statistik + recent activity lintas fitur. */
export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = today.slice(0, 7); // YYYY-MM

  // ── Statistik Todo ──
  const allTodos = db.select().from(todos).all();
  const activeTodos = allTodos.filter((t) => !DONE_STATUSES.includes(t.status) && !t.parentId).length;
  const overdueTodos = allTodos.filter(
    (t) =>
      !DONE_STATUSES.includes(t.status) &&
      !t.parentId &&
      t.dueDate &&
      t.dueDate < today &&
      t.dueDate !== ""
  ).length;
  const todayTodos = allTodos.filter(
    (t) => t.dueDate === today && !DONE_STATUSES.includes(t.status) && !t.parentId
  ).length;

  // ── Statistik Finance (bulan ini) ──
  const monthTxs = db
    .select()
    .from(financeTransactions)
    .where(and(gte(financeTransactions.date, `${monthPrefix}-01`), lte(financeTransactions.date, today)))
    .all();
  const monthIncome = monthTxs.filter((t) => t.type === "masuk").reduce((a, t) => a + t.amount, 0);
  const monthExpense = monthTxs.filter((t) => t.type === "keluar").reduce((a, t) => a + t.amount, 0);

  // ── Sisa uang total (semua transaksi, sepanjang waktu) ──
  const allTxs = db.select().from(financeTransactions).all();
  const totalBalance = allTxs.reduce(
    (a, t) => a + (t.type === "masuk" ? t.amount : -t.amount),
    0
  );

  // ── Statistik Kesehatan & Mood ──
  const lastMood = db.select().from(moodEntries).orderBy(desc(moodEntries.date)).limit(1).get();
  const todayHealth = db
    .select()
    .from(healthEntries)
    .where(eq(healthEntries.date, today))
    .get();

  // ── Statistik Bad Habit: streak terbaik ──
  const habits = db.select().from(badHabits).where(eq(badHabits.active, true)).all();
  let bestHabitStreak = 0;
  for (const h of habits) {
    const logs = db
      .select()
      .from(habitLogs)
      .where(eq(habitLogs.habitId, h.id))
      .all()
      .map((l) => ({ date: l.date, status: l.status as "bersih" | "kambuh", jumlahKambuh: l.jumlahKambuh }));
    const s = computeHabitStats(logs);
    if (s.streak > bestHabitStreak) bestHabitStreak = s.streak;
  }

  // ── Recent Activity: gabungan lintas fitur, urut by createdAt DESC ──
  type Activity = { id: number; type: string; title: string; sub: string; date: string; ts: string };
  const acts: Activity[] = [];

  const push = (type: string, title: string, sub: string, date: string, ts: string, id: number) => {
    if (ts) acts.push({ id, type, title, sub, date, ts });
  };

  for (const tdo of db.select().from(todos).orderBy(desc(todos.createdAt)).limit(6).all()) {
    push("todo", tdo.title, DONE_STATUSES.includes(tdo.status) ? "Tugas selesai" : "Tugas aktif", tdo.dueDate || "", tdo.createdAt ?? "", tdo.id);
  }
  for (const fin of db.select().from(financeTransactions).orderBy(desc(financeTransactions.createdAt)).limit(6).all()) {
    push("finance", fin.description || "Transaksi", fin.type === "masuk" ? `+Rp${fin.amount.toLocaleString("id-ID")}` : `-Rp${fin.amount.toLocaleString("id-ID")}`, fin.date, fin.createdAt ?? "", fin.id);
  }
  for (const mde of db.select().from(moodEntries).orderBy(desc(moodEntries.createdAt)).limit(4).all()) {
    const labels = ["😞", "😕", "😐", "🙂", "😄"];
    push("mood", `Mood: ${labels[mde.mood - 1] ?? "?"}`, mde.note || "Mood dicatat", mde.date, mde.createdAt ?? "", mde.id);
  }
  for (const he of db.select().from(healthEntries).orderBy(desc(healthEntries.createdAt)).limit(4).all()) {
    const parts: string[] = [];
    if (he.sleepHours) parts.push(`tidur ${he.sleepHours} jam`);
    if (he.exerciseMinutes) parts.push(`olahraga ${he.exerciseMinutes} mnt`);
    if (he.steps) parts.push(`${he.steps} langkah`);
    push("health", "Kesehatan dicatat", parts.join(" · ") || "Entri harian", he.date, he.createdAt ?? "", he.id);
  }
  for (const sk of db.select().from(sickEntries).orderBy(desc(sickEntries.createdAt)).limit(4).all()) {
    push("sick", sk.symptoms.slice(0, 60), sk.needsProfessional ? "⚠️ disarankan periksa" : "Tidak enak badan", sk.date, sk.createdAt ?? "", sk.id);
  }
  for (const fam of db.select().from(familyEntries).orderBy(desc(familyEntries.createdAt)).limit(4).all()) {
    push("family", fam.content.slice(0, 60), fam.people ? `Curhat: ${fam.people}` : "Curhat keluarga", fam.date, fam.createdAt ?? "", fam.id);
  }
  for (const hlg of db.select().from(habitLogs).orderBy(desc(habitLogs.createdAt)).limit(6).all()) {
    const habitName = habits.find((x) => x.id === hlg.habitId)?.name ?? "kebiasaan";
    push("habit", `Check-in: ${habitName}`, hlg.status === "bersih" ? "✅ Bersih" : `😬 Kambuh${hlg.jumlahKambuh > 1 ? ` (${hlg.jumlahKambuh}x)` : ""}`, hlg.date, hlg.createdAt ?? "", hlg.id);
  }
  for (const spr of db.select().from(spiritualEntries).orderBy(desc(spiritualEntries.createdAt)).limit(4).all()) {
    push("spiritual", "Ibadah harian", spr.reflection?.slice(0, 60) || `Kualitas ${spr.quality}/5`, spr.date, spr.createdAt ?? "", spr.id);
  }
  for (const act of db.select().from(activities).orderBy(desc(activities.createdAt)).limit(6).all()) {
    push("activity", act.name, act.durationMinutes ? `${act.durationMinutes} menit` : "Aktivitas", act.startedAt.slice(0, 10), act.createdAt ?? "", act.id);
  }
  for (const kn of db.select().from(knowledge).orderBy(desc(knowledge.createdAt)).limit(4).all()) {
    push("knowledge", kn.title, "Catatan Knowledge", "", kn.createdAt ?? "", kn.id);
  }

  // Urutkan: ts (datetime 'YYYY-MM-DD HH:MM:SS') DESC — string compare cukup
  const recent = acts
    .sort((a, b) => (a.ts > b.ts ? -1 : a.ts < b.ts ? 1 : 0))
    .slice(0, 12);

  return NextResponse.json({
    data: {
      stats: {
        activeTodos,
        overdueTodos,
        todayTodos,
        monthIncome,
        monthExpense,
        /** Sisa uang bulan ini = masuk − keluar */
        monthBalance: monthIncome - monthExpense,
        /** Sisa uang total (semua waktu) */
        totalBalance,
        lastMood: lastMood ?? null,
        todayHealth: todayHealth ?? null,
        bestHabitStreak,
        habitCount: habits.length,
      },
      recent,
    },
  });
}
