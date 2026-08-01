import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";

/**
 * POST /api/time/activities/manual — catat aktivitas MANUAL (bukan timer).
 * Body: { name, description?, categoryId?, date?, startTime?, endTime?, tags? }
 * - date: YYYY-MM-DD (default hari ini)
 * - startTime / endTime: HH:MM (default = jam sekarang)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama aktivitas wajib diisi" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const date = String(body.date || today);
    const startTime = String(body.startTime || nowHHMM);
    const endTime = String(body.endTime || nowHHMM);

    // ISO datetime lokal (tanpa Z — konsisten dengan timer lama yang pakai UTC ISO)
    const startedAt = `${date}T${startTime}:00`;
    const endedAt = `${date}T${endTime}:00`;

    // Durasi menit (end - start)
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const durationMinutes = Math.max(1, endMin - startMin);

    // Tags: array → JSON
    const tagsRaw = Array.isArray(body.tags) ? body.tags : [];
    const tags = tagsRaw
      .map((t: unknown) => String(t).trim())
      .filter((t: string) => t.length > 0)
      .slice(0, 10);

    const row = db
      .insert(activities)
      .values({
        name,
        description: String(body.description || "").trim(),
        categoryId: body.categoryId ? Number(body.categoryId) : null,
        tags: JSON.stringify(tags),
        startedAt,
        endedAt,
        durationMinutes,
      })
      .returning()
      .get();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/time/activities/manual error:", err);
    return NextResponse.json({ error: "Gagal menyimpan aktivitas" }, { status: 500 });
  }
}
