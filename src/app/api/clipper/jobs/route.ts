import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { clipperJobs } from "@/lib/db/schema";
import { runDownloadJob } from "@/lib/clipper";

/** GET /api/clipper/jobs — daftar job dengan filter & pagination. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status"); // all | running | done | failed | cancelled
  const type = sp.get("type"); // all | download | transcribe | analyze | clip
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
  const offset = Math.max(0, Number(sp.get("offset")) || 0);

  const conds = [];
  if (status && status !== "all") {
    if (status === "running") conds.push(inArray(clipperJobs.status, ["queued", "running"] as const));
    else conds.push(eq(clipperJobs.status, status as "done" | "failed" | "cancelled"));
  }
  if (type && type !== "all") conds.push(eq(clipperJobs.type, type as "download" | "transcribe" | "analyze" | "clip"));

  const where = conds.length ? and(...conds) : undefined;
  const rows = db.select().from(clipperJobs).where(where).orderBy(desc(clipperJobs.id)).limit(limit).offset(offset).all();
  const total = db.select({ count: clipperJobs.id }).from(clipperJobs).where(where).all().length;
  return NextResponse.json({ data: rows, total });
}

/** DELETE /api/clipper/jobs?status=done|cancelled|failed — bersihkan riwayat status terminal (kecuali queued/running). */
export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status"); // done | cancelled | failed | (semua terminal jika kosong)
  const statuses: ("done" | "cancelled" | "failed")[] = status
    ? [status as "done" | "cancelled" | "failed"]
    : ["done", "cancelled", "failed"];
  try {
    const result = db.delete(clipperJobs).where(inArray(clipperJobs.status, statuses)).run();
    return NextResponse.json({ ok: true, deleted: result.changes });
  } catch {
    return NextResponse.json({ error: "Gagal membersihkan job" }, { status: 500 });
  }
}

/** POST /api/clipper/jobs — mulai job {type:"download", url}. */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const url = String(b.url || "").trim();
    const type = String(b.type || "download");

    if (type === "download") {
      if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i.test(url)) {
        return NextResponse.json({ error: "URL harus video YouTube (youtube.com / youtu.be)" }, { status: 400 });
      }
      const row = db
        .insert(clipperJobs)
        .values({ type: "download", url, status: "queued", progress: 0, message: "Antrean…" })
        .returning()
        .get();
      // Jalankan async (fire & forget) — progress di-update ke DB
      void runDownloadJob(row.id, url);
      return NextResponse.json({ data: row }, { status: 201 });
    }

    return NextResponse.json({ error: `Tipe job belum didukung: ${type}` }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Gagal membuat job" }, { status: 500 });
  }
}
