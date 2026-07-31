import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { spiritualEntries } from "@/lib/db/schema";
import { listSpiritualEntries } from "@/lib/db/spiritual-repo";

/** GET /api/spiritual/entries — riwayat + stats */
export async function GET() {
  const rows = listSpiritualEntries();
  return NextResponse.json({ data: rows });
}

/** POST /api/spiritual/entries — upsert entri harian (ritual checklist, kualitas, refleksi) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const date = String(body.date || new Date().toISOString().slice(0, 10));

    const existing = db
      .select()
      .from(spiritualEntries)
      .where(eq(spiritualEntries.date, date))
      .get();

    const rituals = JSON.stringify(body.rituals ?? {});
    const quality = body.quality !== undefined ? Math.max(1, Math.min(5, Math.round(Number(body.quality)))) : undefined;
    const reflection = body.reflection !== undefined ? String(body.reflection) : undefined;

    const row = existing
      ? db
          .update(spiritualEntries)
          .set({
            rituals: rituals !== "{}" || !existing.rituals ? rituals : existing.rituals,
            quality: quality ?? existing.quality,
            reflection: reflection ?? existing.reflection,
          })
          .where(eq(spiritualEntries.id, existing.id))
          .returning()
          .get()
      : db
          .insert(spiritualEntries)
          .values({
            date,
            rituals,
            quality: quality ?? 0,
            reflection: reflection ?? "",
          })
          .returning()
          .get();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/spiritual/entries error:", err);
    return NextResponse.json({ error: "Gagal menyimpan entri spiritual" }, { status: 500 });
  }
}
