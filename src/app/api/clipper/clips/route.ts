import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clipperClips, clipperPresets, clipperJobs } from "@/lib/db/schema";
import { runClipJob } from "@/lib/clipper";

/** GET /api/clipper/clips — daftar clip + info file. */
export async function GET() {
  const rows = db.select().from(clipperClips).orderBy(desc(clipperClips.id)).all();
  const clips = rows.map((c) => {
    let exists = false;
    let size = c.sizeBytes ?? 0;
    try {
      exists = fs.existsSync(c.filePath);
      if (exists) size = fs.statSync(c.filePath).size;
    } catch {
      exists = false;
    }
    return { ...c, exists, sizeBytes: size };
  });
  return NextResponse.json({ data: clips });
}

/** POST /api/clipper/clips — mulai job clip {videoId, presetId, startSec, endSec, quality}. */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const videoId = Number(b.videoId);
    const presetId = Number(b.presetId) || 0;
    const startSec = Number(b.startSec);
    const endSec = Number(b.endSec);
    const quality = [360, 480, 720, 1080].includes(Number(b.quality)) ? Number(b.quality) : 720;
    const meta = b.meta && typeof b.meta === "object" ? b.meta : { title: b.title, hookLine: b.hookLine, tags: b.tags, score: b.score };
    if (!Number.isFinite(videoId) || !Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) {
      return NextResponse.json({ error: "Parameter clip tidak valid (videoId, startSec < endSec)" }, { status: 400 });
    }
    const preset = (presetId
      ? db.select().from(clipperPresets).where(eq(clipperPresets.id, presetId)).get()
      : db.select().from(clipperPresets).where(eq(clipperPresets.isDefault, 1)).get()) ?? {
      id: 0,
      name: "Default",
      ratio: "9:16" as const,
      captionPosition: "bottom" as const,
      captionSize: 28,
      captionColor: "white",
      captionBg: "black@0.4",
      ctaText: "",
      ctaPosition: "bottom" as const,
      ctaColor: "#FFD400",
      ctaSize: 30,
      ctaBorderSize: 0,
      ctaBorderColor: "#000000",
      showSource: 0,
      sourcePosition: "bottom" as const,
      sourceShowUrl: 1,
      sourcePrefix: "Sumber YouTube :",
      srcBg: "black@0.55",
      sourceSize: 16,
      fontFamily: "Arial",
      captionMode: "sentence" as const,
      ctaBg: "black@0.5",
      hookVoice: 0,
      hookVoiceName: "id-ID-GadisNeural",
      showIntro: 0,
      introDuration: 2,
      introBg: "#0D9488",
      introUseVideo: 1,
      introBorderColor: "#3B82F6",
      watermark: "",
      isDefault: 0,
    };

    const row = db.insert(clipperJobs).values({ type: "clip", videoId, status: "queued", message: "Antrean…" }).returning().get();
    void runClipJob(
      row.id,
      videoId,
      {
        ratio: preset.ratio,
        captionPosition: preset.captionPosition,
        captionSize: preset.captionSize,
        captionColor: preset.captionColor,
        captionBg: preset.captionBg,
        ctaText: preset.ctaText ?? "",
        ctaPosition: preset.ctaPosition,
        ctaColor: preset.ctaColor || "#FFD400",
        ctaSize: preset.ctaSize || 30,
        ctaBorderSize: preset.ctaBorderSize || 0,
        ctaBorderColor: preset.ctaBorderColor || "#000000",
        showSource: preset.showSource ?? 0,
        sourcePosition: preset.sourcePosition ?? "bottom",
        sourceShowUrl: preset.sourceShowUrl ?? 1,
        sourcePrefix: preset.sourcePrefix || "Sumber YouTube :",
        srcBg: preset.srcBg || "black@0.55",
        sourceSize: preset.sourceSize || 16,
        fontFamily: preset.fontFamily || "Arial",
        captionMode: preset.captionMode || "sentence",
        hookVoice: preset.hookVoice ?? 0,
        hookVoiceName: preset.hookVoiceName || "id-ID-GadisNeural",
        showIntro: preset.showIntro ?? 0,
        introDuration: preset.introDuration || 2,
        introBg: preset.introBg || "#0D9488",
        introUseVideo: preset.introUseVideo ?? 1,
        introBorderColor: preset.introBorderColor || "#3B82F6",
        ctaBg: preset.ctaBg || "black@0.5",
      },
      startSec,
      endSec,
      quality,
      {
        title: String(meta.title || ""),
        hookLine: String(meta.hookLine || ""),
        tags: String(meta.tags || ""),
        score: Number(meta.score) || 0,
        emotion: String(meta.emotion || ""),
        reason: String(meta.reason || ""),
      },
      presetId || 0
    );
    return NextResponse.json({ data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal memulai clip" }, { status: 500 });
  }
}
