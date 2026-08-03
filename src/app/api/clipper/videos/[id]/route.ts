import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clipperVideos, clipperTranscripts, clipperAnalyses, clipperJobs } from "@/lib/db/schema";
import { runTranscribeJob, runAnalyzeJob } from "@/lib/clipper";

/** GET /api/clipper/videos/[id] — detail video + transkrip + analisa terakhir. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const num = Number(id);
  const video = db.select().from(clipperVideos).where(eq(clipperVideos.id, num)).get();
  if (!video) return NextResponse.json({ error: "Video tidak ditemukan" }, { status: 404 });
  const transcript = db.select().from(clipperTranscripts).where(eq(clipperTranscripts.videoId, num)).orderBy(desc(clipperTranscripts.id)).get() ?? null;
  const analysis = db.select().from(clipperAnalyses).where(eq(clipperAnalyses.videoId, num)).orderBy(desc(clipperAnalyses.id)).get() ?? null;
  return NextResponse.json({
    data: video,
    transcript: transcript ? { ...transcript, segments: JSON.parse(transcript.segmentsJson) } : null,
    analysis: analysis ? { ...analysis, candidates: JSON.parse(analysis.candidatesJson) } : null,
  });
}

/** POST /api/clipper/videos/[id] — {action:"transcribe"|"analyze"} mulai job. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const videoId = Number(id);
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "");

  if (action === "transcribe") {
    const row = db.insert(clipperJobs).values({ type: "transcribe", videoId, status: "queued", message: "Antrean…" }).returning().get();
    void runTranscribeJob(row.id, videoId);
    return NextResponse.json({ data: row }, { status: 201 });
  }
  if (action === "analyze") {
    const row = db.insert(clipperJobs).values({ type: "analyze", videoId, status: "queued", message: "Antrean…" }).returning().get();
    void runAnalyzeJob(row.id, videoId, { customPrompt: String(b.customPrompt || ""), minLength: Number(b.minLength) || 0 });
    return NextResponse.json({ data: row }, { status: 201 });
  }
  return NextResponse.json({ error: "Aksi tidak dikenal (transcribe | analyze)" }, { status: 400 });
}
