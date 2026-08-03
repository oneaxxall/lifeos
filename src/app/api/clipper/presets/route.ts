import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clipperPresets } from "@/lib/db/schema";

const pick = (b: Record<string, unknown>) => ({
  name: String(b.name || "Preset").slice(0, 60),
  ratio: (["9:16", "1:1", "original"].includes(String(b.ratio)) ? String(b.ratio) : "9:16") as "9:16" | "1:1" | "original",
  captionPosition: (["top", "center", "bottom"].includes(String(b.captionPosition)) ? String(b.captionPosition) : "bottom") as "top" | "center" | "bottom",
  captionSize: Number(b.captionSize) || 28,
  captionColor: String(b.captionColor || "white").slice(0, 30),
  captionBg: String(b.captionBg || "black@0.4").slice(0, 30),
  ctaText: String(b.ctaText || "").slice(0, 120),
  ctaPosition: (["top", "center", "bottom"].includes(String(b.ctaPosition)) ? String(b.ctaPosition) : "bottom") as "top" | "center" | "bottom",
  ctaColor: String(b.ctaColor || "#FFD400").slice(0, 20),
  ctaSize: Math.min(80, Math.max(14, Number(b.ctaSize) || 32)),
  ctaBorderSize: Math.min(12, Math.max(0, Number(b.ctaBorderSize) || 0)),
  ctaBorderColor: String(b.ctaBorderColor || "#000000").slice(0, 20),
  showSource: b.showSource ? 1 : 0,
  sourcePosition: (["top", "bottom"].includes(String(b.sourcePosition)) ? String(b.sourcePosition) : "bottom") as "top" | "bottom",
  sourceShowUrl: b.sourceShowUrl !== undefined ? (b.sourceShowUrl ? 1 : 0) : 1,
  sourcePrefix: String(b.sourcePrefix || "Sumber YouTube :").slice(0, 60),
  srcBg: String(b.srcBg || "black@0.55").slice(0, 30),
  sourceSize: Math.min(30, Math.max(10, Number(b.sourceSize) || 16)),
  fontFamily: ["Arial", "Inter", "Plus Jakarta Sans", "Anton", "Georgia", "Courier", "Impact"].includes(String(b.fontFamily)) ? String(b.fontFamily) : "Inter",
  captionMode: (["sentence", "word", "off"].includes(String(b.captionMode)) ? String(b.captionMode) : "sentence") as "sentence" | "word" | "off",
  ctaBg: String(b.ctaBg || "black@0.5").slice(0, 30),
  hookVoice: b.hookVoice ? 1 : 0,
  hookVoiceName: ["id-ID-GadisNeural", "id-ID-ArdiNeural"].includes(String(b.hookVoiceName)) ? String(b.hookVoiceName) : "id-ID-GadisNeural",
  showIntro: b.showIntro ? 1 : 0,
  introDuration: Math.min(6, Math.max(1, Number(b.introDuration) || 2)),
  introBg: String(b.introBg || "#0D9488").slice(0, 20),
  introUseVideo: b.introUseVideo !== undefined ? (b.introUseVideo ? 1 : 0) : 1,
  introBorderColor: String(b.introBorderColor || "#3B82F6").slice(0, 20),
  watermark: String(b.watermark || "").slice(0, 60),
  isDefault: b.isDefault ? 1 : 0,
});

export async function GET() {
  const rows = db.select().from(clipperPresets).orderBy(asc(clipperPresets.id)).all();
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const row = db.insert(clipperPresets).values(pick(b)).returning().get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan preset" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const b = await req.json();
    const id = Number(b.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
    const sets: Record<string, unknown> = {};
    if (typeof b.name === "string" && b.name.trim()) sets.name = b.name.trim().slice(0, 60);
    if (typeof b.ratio === "string" && ["9:16", "1:1", "original"].includes(b.ratio)) sets.ratio = b.ratio;
    if (typeof b.captionPosition === "string" && ["top", "center", "bottom"].includes(b.captionPosition)) sets.captionPosition = b.captionPosition;
    if (typeof b.captionSize === "number") sets.captionSize = b.captionSize;
    if (typeof b.captionColor === "string") sets.captionColor = b.captionColor.slice(0, 30);
    if (typeof b.captionBg === "string") sets.captionBg = b.captionBg.slice(0, 30);
    if (typeof b.ctaText === "string") sets.ctaText = b.ctaText.slice(0, 120);
    if (typeof b.ctaPosition === "string" && ["top", "center", "bottom"].includes(b.ctaPosition)) sets.ctaPosition = b.ctaPosition;
    if (typeof b.ctaColor === "string") sets.ctaColor = b.ctaColor.slice(0, 20);
    if (typeof b.ctaSize === "number") sets.ctaSize = Math.min(80, Math.max(14, b.ctaSize));
    if (typeof b.ctaBorderSize === "number") sets.ctaBorderSize = Math.min(12, Math.max(0, b.ctaBorderSize));
    if (typeof b.ctaBorderColor === "string") sets.ctaBorderColor = b.ctaBorderColor.slice(0, 20);
    if (typeof b.showSource === "number" || typeof b.showSource === "boolean") sets.showSource = b.showSource ? 1 : 0;
    if (typeof b.sourcePosition === "string" && ["top", "bottom"].includes(b.sourcePosition)) sets.sourcePosition = b.sourcePosition;
    if (typeof b.sourceShowUrl === "number" || typeof b.sourceShowUrl === "boolean") sets.sourceShowUrl = b.sourceShowUrl ? 1 : 0;
    if (typeof b.sourcePrefix === "string") sets.sourcePrefix = b.sourcePrefix.slice(0, 60);
    if (typeof b.srcBg === "string") sets.srcBg = b.srcBg.slice(0, 30);
    if (typeof b.sourceSize === "number") sets.sourceSize = Math.min(30, Math.max(10, b.sourceSize));
    if (typeof b.fontFamily === "string" && ["Arial", "Inter", "Plus Jakarta Sans", "Anton", "Georgia", "Courier", "Impact"].includes(b.fontFamily)) sets.fontFamily = b.fontFamily;
    if (typeof b.captionMode === "string" && ["sentence", "word", "off"].includes(b.captionMode)) sets.captionMode = b.captionMode;
    if (typeof b.ctaBg === "string") sets.ctaBg = b.ctaBg.slice(0, 30);
    if (typeof b.hookVoice === "number" || typeof b.hookVoice === "boolean") sets.hookVoice = b.hookVoice ? 1 : 0;
    if (typeof b.hookVoiceName === "string" && ["id-ID-GadisNeural", "id-ID-ArdiNeural"].includes(b.hookVoiceName)) sets.hookVoiceName = b.hookVoiceName;
    if (typeof b.showIntro === "number" || typeof b.showIntro === "boolean") sets.showIntro = b.showIntro ? 1 : 0;
    if (typeof b.introDuration === "number") sets.introDuration = Math.min(6, Math.max(1, b.introDuration));
    if (typeof b.introBg === "string") sets.introBg = b.introBg.slice(0, 20);
    if (typeof b.introUseVideo === "number" || typeof b.introUseVideo === "boolean") sets.introUseVideo = b.introUseVideo ? 1 : 0;
    if (typeof b.introBorderColor === "string") sets.introBorderColor = b.introBorderColor.slice(0, 20);
    if (typeof b.watermark === "string") sets.watermark = b.watermark.slice(0, 60);
    if (typeof b.isDefault === "number" || typeof b.isDefault === "boolean") {
      const def = b.isDefault ? 1 : 0;
      if (def === 1) {
        // Reset semua preset lain, baru set yang ini
        await db.update(clipperPresets).set({ isDefault: 0 }).run();
      }
      sets.isDefault = def;
    }
    if (Object.keys(sets).length === 0) return NextResponse.json({ error: "Tidak ada field valid" }, { status: 400 });
    await db.update(clipperPresets).set(sets).where(eq(clipperPresets.id, id)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui preset" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  await db.delete(clipperPresets).where(eq(clipperPresets.id, id)).run();
  return NextResponse.json({ ok: true });
}
