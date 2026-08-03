import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clipperVideos } from "@/lib/db/schema";
import { VIDEO_DIR } from "@/lib/clipper";

/** Hitung ukuran folder rekursif (byte). */
function dirSize(dir: string): number {
  let total = 0;
  try {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      total += st.isDirectory() ? dirSize(p) : st.size;
    }
  } catch {
    // folder belum ada
  }
  return total;
}

/** GET /api/clipper/videos — daftar video + usage disk folder. */
export async function GET() {
  const rows = db.select().from(clipperVideos).orderBy(desc(clipperVideos.id)).all();
  // Info file aktual (bisa terhapus manual)
  const videos = rows.map((v) => {
    let exists = false;
    let size = v.sizeBytes ?? 0;
    try {
      exists = fs.existsSync(v.filePath);
      if (exists) size = fs.statSync(v.filePath).size;
    } catch {
      exists = false;
    }
    return { ...v, exists, sizeBytes: size };
  });
  const totalSize = dirSize(VIDEO_DIR);
  return NextResponse.json({ data: videos, usage: { totalSize, dir: VIDEO_DIR } });
}

/** DELETE /api/clipper/videos?id=N — hapus file + baris DB. */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const row = db.select().from(clipperVideos).where(eq(clipperVideos.id, id)).get();
  if (!row) return NextResponse.json({ error: "Video tidak ditemukan" }, { status: 404 });
  try {
    if (fs.existsSync(row.filePath)) fs.unlinkSync(row.filePath);
  } catch {
    // file mungkin sudah hilang
  }
  db.delete(clipperVideos).where(eq(clipperVideos.id, id)).run();
  return NextResponse.json({ ok: true });
}
