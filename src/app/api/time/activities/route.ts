import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import {
  getActiveActivity,
  listActivities,
  listActivityCategories,
} from "@/lib/db/time-repo";

/** GET /api/time/activities — daftar aktivitas + kategori + yang sedang berjalan */
export async function GET() {
  const data = listActivities(100);
  const categories = listActivityCategories();
  const active = getActiveActivity();
  return NextResponse.json({ data, categories, active });
}

/** POST /api/time/activities — mulai timer (1 ketukan) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama aktivitas wajib diisi" }, { status: 400 });
    }

    // Hentikan aktivitas lain yang masih berjalan (1 timer saja)
    const running = getActiveActivity();
    if (running) {
      const end = new Date().toISOString();
      const dur = Math.max(
        1,
        Math.round((new Date(end).getTime() - new Date(running.startedAt).getTime()) / 60000)
      );
      db.update(activities)
        .set({ endedAt: end, durationMinutes: dur })
        .where(eq(activities.id, running.id))
        .run();
    }

    const row = db
      .insert(activities)
      .values({
        name,
        categoryId: body.categoryId ? Number(body.categoryId) : null,
        startedAt: new Date().toISOString(),
        endedAt: "",
      })
      .returning()
      .get();

    return NextResponse.json({ data: row, stoppedPrevious: running?.name ?? null }, { status: 201 });
  } catch (err) {
    console.error("POST /api/time/activities error:", err);
    return NextResponse.json({ error: "Gagal memulai timer" }, { status: 500 });
  }
}

/** PATCH /api/time/activities/stop — hentikan timer berjalan */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    const running = getActiveActivity();
    const target = running && (!id || running.id === id) ? running : null;
    if (!target) {
      return NextResponse.json({ error: "Tidak ada timer berjalan" }, { status: 400 });
    }

    const end = new Date().toISOString();
    const dur = Math.max(
      1,
      Math.round((new Date(end).getTime() - new Date(target.startedAt).getTime()) / 60000)
    );
    const row = db
      .update(activities)
      .set({ endedAt: end, durationMinutes: dur })
      .where(eq(activities.id, target.id))
      .returning()
      .get();

    return NextResponse.json({ data: row });
  } catch (err) {
    console.error("PATCH /api/time/activities error:", err);
    return NextResponse.json({ error: "Gagal menghentikan timer" }, { status: 500 });
  }
}
