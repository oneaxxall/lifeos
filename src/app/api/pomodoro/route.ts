import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, pomodoroSessions } from "@/lib/db/schema";

/** GET /api/pomodoro — statistik hari ini + riwayat sesi. */
export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  const todaySessions = db
    .select()
    .from(pomodoroSessions)
    .where(eq(pomodoroSessions.date, today))
    .all();
  const allSessions = db
    .select()
    .from(pomodoroSessions)
    .orderBy(asc(pomodoroSessions.createdAt))
    .all();

  const todayFocus = todaySessions
    .filter((s) => s.completed)
    .reduce((a, s) => a + s.durationMinutes, 0);
  const todayCount = todaySessions.filter((s) => s.completed).length;
  const totalFocus = allSessions
    .filter((s) => s.completed)
    .reduce((a, s) => a + s.durationMinutes, 0);
  const totalCount = allSessions.filter((s) => s.completed).length;
  const cycle = todayCount + 1; // siklus berikutnya

  return NextResponse.json({
    data: {
      todayFocus,
      todayCount,
      totalFocus,
      totalCount,
      cycle,
      sessions: todaySessions,
    },
  });
}

/** POST /api/pomodoro — simpan sesi selesai + auto-log aktivitas produktif. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const duration = Math.min(120, Math.max(1, Number(body.durationMinutes) || 25));
    const completed = body.completed !== false;
    const task = String(body.task || "").trim();
    const today = new Date().toISOString().slice(0, 10);
    const cycle = Math.max(1, Number(body.cycle) || 1);

    const row = db
      .insert(pomodoroSessions)
      .values({
        date: today,
        durationMinutes: duration,
        cycle,
        task,
        completed,
      })
      .returning()
      .get();

    // Auto-log sebagai aktivitas produktif di fitur Time/Activity
    if (completed) {
      const now = new Date();
      const startedAt = new Date(now.getTime() - duration * 60000).toISOString();
      const name = task ? `🍅 Pomodoro: ${task}` : "🍅 Pomodoro fokus";
      db.insert(activities)
        .values({
          name,
          description: `Sesi fokus ${duration} menit${task ? ` — ${task}` : ""}`,
          tags: JSON.stringify(["pomodoro"]),
          startedAt,
          endedAt: new Date().toISOString(),
          durationMinutes: duration,
        })
        .run();
    }

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/pomodoro error:", err);
    return NextResponse.json({ error: "Gagal menyimpan sesi" }, { status: 500 });
  }
}
