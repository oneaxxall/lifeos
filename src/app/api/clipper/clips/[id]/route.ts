import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clipperClips } from "@/lib/db/schema";

/** DELETE — hapus clip (file + baris DB). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clipId = Number(id);
  if (!Number.isFinite(clipId)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }
  const clip = db.select().from(clipperClips).where(eq(clipperClips.id, clipId)).get();
  if (!clip) {
    return NextResponse.json({ error: "Clip tidak ditemukan" }, { status: 404 });
  }
  try {
    if (clip.filePath && fs.existsSync(clip.filePath)) fs.unlinkSync(clip.filePath);
  } catch {
    // file mungkin sudah hilang — lanjut hapus baris
  }
  db.delete(clipperClips).where(eq(clipperClips.id, clipId)).run();
  return NextResponse.json({ ok: true });
}
