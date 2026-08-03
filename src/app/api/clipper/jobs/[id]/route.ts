import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clipperJobs } from "@/lib/db/schema";
import { cancelJob } from "@/lib/clipper";

/** GET /api/clipper/jobs/[id] — status satu job. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.select().from(clipperJobs).where(eq(clipperJobs.id, Number(id))).get();
  if (!row) return NextResponse.json({ error: "Job tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: row });
}

/** POST /api/clipper/jobs/[id] — cancel job berjalan. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  const ok = cancelJob(jobId);
  if (!ok) {
    // job tidak berjalan — tandai cancelled jika masih queued
    const row = db.select().from(clipperJobs).where(eq(clipperJobs.id, jobId)).get();
    if (row && (row.status === "queued" || row.status === "running")) {
      db.update(clipperJobs).set({ status: "cancelled", message: "Dibatalkan" }).where(eq(clipperJobs.id, jobId)).run();
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Job tidak sedang berjalan" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
