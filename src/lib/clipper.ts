import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { clipperJobs, clipperVideos, clipperTranscripts, clipperAnalyses, clipperClips, clipperSettings } from "@/lib/db/schema";
import { generateText } from "ai";
import { getChatModel } from "@/lib/ai/provider";
import sharp from "sharp";

export const VIDEO_DIR = path.join(process.cwd(), "data", "videos");
export const CLIP_DIR = path.join(process.cwd(), "data", "clips");
export const PYTHON = process.env.CLIPPER_PYTHON || path.join(process.env.HOME ?? "", ".lifeos-tools", "venv-clipper", "bin", "python");
export const TRANSCRIBE_SCRIPT = path.join(process.cwd(), "scripts", "transcribe.py");

// Pastikan folder output ada
fs.mkdirSync(VIDEO_DIR, { recursive: true });
fs.mkdirSync(CLIP_DIR, { recursive: true });

/** Env bersih untuk subprocess (hindari PYTHONPATH Hermes bocor). */
const CLEAN_ENV: NodeJS.ProcessEnv = { ...process.env, PYTHONPATH: "", PYTHONHOME: "" };

/** Map jobId → child process (untuk cancel). */
const runningJobs = new Map<number, ChildProcess>();

function updateJob(id: number, sets: Partial<typeof clipperJobs.$inferInsert>) {
  db.update(clipperJobs).set({ ...sets, updatedAt: sql`(datetime('now'))` }).where(eq(clipperJobs.id, id)).run();
}

/** Baca settingan clipper (key-value). */
export function getClipperSetting(key: string): string {
  try {
    const row = db.select().from(clipperSettings).where(eq(clipperSettings.key, key)).get();
    return row?.value ?? "";
  } catch {
    return "";
  }
}

/** Args --cookies bila file cookie tersedia (VPS: YouTube minta autentikasi). */
export function clipperCookieArgs(): string[] {
  const p = getClipperSetting("cookies_path").trim();
  if (p && fs.existsSync(p)) return ["--cookies", p];
  return [];
}

/** Client youtube yang berhasil untuk tiap job (agar download pakai client yang sama). */
export const jobClientArgs = new Map<number, string[]>();

/** Ambil metadata video via yt-dlp --dump-single-json. Retry chain: default+cookies → android → tv → web_safari. */
export function fetchVideoMeta(url: string): Promise<{ meta: { title: string; channel: string; duration: number; thumbnail: string; id: string }; clientArgs: string[] }> {
  return new Promise((resolve, reject) => {
    const tryExtract = (args: string[]): Promise<{ ok: boolean; data?: string; err?: string }> =>
      new Promise((res) => {
        const out = spawn("yt-dlp", ["--dump-single-json", "--no-playlist", "-4", ...args, url]);
        let buf = "";
        let errBuf = "";
        out.stdout.on("data", (d: Buffer) => (buf += String(d)));
        out.stderr.on("data", (d: Buffer) => (errBuf += String(d)));
        out.on("error", (e) => res({ ok: false, err: `yt-dlp tidak ditemukan: ${e.message}` }));
        out.on("close", (code) => {
          if (code !== 0) return res({ ok: false, err: errBuf.slice(-300) });
          const start = buf.indexOf("{");
          if (start < 0) return res({ ok: false, err: "JSON tidak ditemukan" });
          res({ ok: true, data: buf.slice(start) });
        });
      });

    void (async () => {
      const cookies = clipperCookieArgs();
      // Percobaan 1: client default + cookies (bila ada)
      let r = await tryExtract([...cookies, "--extractor-args", "youtube:player_client=default"]);
      let clientArgs: string[] = ["--extractor-args", "youtube:player_client=default"];
      // Percobaan 2: android TANPA cookies (android tidak support cookies)
      if (!r.ok) {
        r = await tryExtract(["--extractor-args", "youtube:player_client=android"]);
        clientArgs = ["--extractor-args", "youtube:player_client=android"];
      }
      // Percobaan 3: tv TANPA cookies
      if (!r.ok) {
        r = await tryExtract(["--extractor-args", "youtube:player_client=tv"]);
        clientArgs = ["--extractor-args", "youtube:player_client=tv"];
      }
      // Percobaan 4: web_safari TANPA cookies
      if (!r.ok) {
        r = await tryExtract(["--extractor-args", "youtube:player_client=web_safari"]);
        clientArgs = ["--extractor-args", "youtube:player_client=web_safari"];
      }
      if (!r.ok || !r.data) {
        return reject(new Error(`Gagal mengambil metadata (video mungkin tidak tersedia)${r?.err ? ` — ${r.err.slice(0, 160)}` : ""}`));
      }
      try {
        const j = JSON.parse(r.data);
        resolve({
          meta: {
            title: String(j.title || "Untitled").replace(/[\\/:*?"<>|]/g, "-").slice(0, 120),
            channel: String(j.channel || ""),
            duration: Number(j.duration || 0),
            thumbnail: String(j.thumbnail || ""),
            id: String(j.id || ""),
          },
          clientArgs,
        });
      } catch {
        reject(new Error("Gagal parse metadata video"));
      }
    })();
  });
}

/** Jalankan download yt-dlp — progress dipantau & di-update ke job DB. */
export async function runDownloadJob(jobId: number, url: string): Promise<void> {
  let meta: { title: string; channel: string; duration: number; thumbnail: string; id: string };
  try {
    updateJob(jobId, { status: "running", progress: 1, message: "Mengambil metadata…" });
    const res = await fetchVideoMeta(url);
    meta = res.meta;
    jobClientArgs.set(jobId, res.clientArgs);
    updateJob(jobId, { message: `Mengunduh: ${meta.title}` });
  } catch (e) {
    updateJob(jobId, { status: "failed", message: e instanceof Error ? e.message : "Gagal" });
    return;
  }

  const safeTitle = meta.title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 100);
  const output = path.join(VIDEO_DIR, `${safeTitle} [${meta.id}].%(ext)s`);
  // Pakai client yang sama dengan metadata (cookies hanya utk client default/web)
  const clientArgs = jobClientArgs.get(jobId) ?? [];
  const useCookies = clientArgs.includes("default") ? clipperCookieArgs() : [];
  const child = spawn("yt-dlp", [
    "--newline",
    "--no-playlist",
    "-4",
    ...useCookies,
    ...clientArgs,
    "-f", "bv*+ba/b",
    "--merge-output-format", "mp4",
    "--progress-template", "download:%(progress.downloaded_bytes)s/%(progress.total_bytes)s/%(progress.speed)s/%(progress.eta)s",
    "-o", output,
    url,
  ]);
  runningJobs.set(jobId, child);

  child.stdout.on("data", (d: Buffer) => {
    const line = String(d);
    const m = line.match(/download:([0-9.]+)\/([0-9.]+)\/([0-9.e+]+)\/([\w:]+)/);
    if (m) {
      const downloaded = Number(m[1]);
      const total = Number(m[2]);
      const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
      const speed = formatSpeed(Number(m[3]));
      const eta = m[4] !== "NA" ? ` · ETA ${m[4]}` : "";
      updateJob(jobId, { progress: Math.min(99, pct), message: speed ? `Mengunduh… ${speed}/s${eta}` : `Mengunduh… ${pct}%` });
    }
  });

  child.on("error", (e) => {
    runningJobs.delete(jobId);
    updateJob(jobId, { status: "failed", message: e.message });
  });

  child.on("close", (code) => {
    runningJobs.delete(jobId);
    if (code !== 0) {
      updateJob(jobId, { status: "failed", message: "Download gagal" });
      return;
    }
    try {
      const files = fs.readdirSync(VIDEO_DIR);
      const file = files
        .filter((f) => f.includes(`[${meta.id}]`) && (f.endsWith(".mp4") || f.endsWith(".mkv") || f.endsWith(".webm")))
        .sort((a, b) => fs.statSync(path.join(VIDEO_DIR, b)).mtimeMs - fs.statSync(path.join(VIDEO_DIR, a)).mtimeMs)[0];
      if (!file) throw new Error("File tidak ditemukan setelah download");
      const fullPath = path.join(VIDEO_DIR, file);
      const size = fs.statSync(fullPath).size;
      const row = db
        .insert(clipperVideos)
        .values({
          title: meta.title,
          channel: meta.channel,
          url,
          filePath: fullPath,
          durationSec: meta.duration,
          sizeBytes: size,
          thumbnail: meta.thumbnail,
          status: "downloaded",
        })
        .returning()
        .get();
      updateJob(jobId, { status: "done", progress: 100, message: "Selesai", videoId: row.id });
    } catch (e) {
      updateJob(jobId, { status: "failed", message: e instanceof Error ? e.message : "File tidak ditemukan" });
    }
  });
}

/** Hentikan job yang sedang berjalan. */
export function cancelJob(jobId: number): boolean {
  const child = runningJobs.get(jobId);
  if (!child) return false;
  try {
    child.kill("SIGKILL");
  } catch {
    // abaikan
  }
  runningJobs.delete(jobId);
  updateJob(jobId, { status: "cancelled", message: "Dibatalkan" });
  return true;
}

/** Transcribe video via faster-whisper (venv python). */
export async function runTranscribeJob(jobId: number, videoId: number): Promise<void> {
  const video = db.select().from(clipperVideos).where(eq(clipperVideos.id, videoId)).get();
  if (!video || !fs.existsSync(video.filePath)) {
    updateJob(jobId, { status: "failed", message: "File video tidak ditemukan" });
    return;
  }
  updateJob(jobId, { status: "running", progress: 1, message: "Memuat model Whisper…" });
  const outPath = path.join(VIDEO_DIR, `transcript_${videoId}.json`);
  const child = spawn(PYTHON, [TRANSCRIBE_SCRIPT, "--input", video.filePath, "--output", outPath, "--model", "small"], { env: CLEAN_ENV });
  runningJobs.set(jobId, child);

  child.stderr.on("data", (d: Buffer) => {
    const line = String(d);
    const m = line.match(/progress:(\d+)/);
    if (m) {
      const pct = Number(m[1]);
      updateJob(jobId, { progress: Math.max(2, pct), message: `Transkrip… ${pct}%` });
    }
    const err = line.match(/error:(.+)/);
    if (err) updateJob(jobId, { message: err[1].trim() });
  });

  child.on("error", (e) => {
    runningJobs.delete(jobId);
    updateJob(jobId, { status: "failed", message: `Whisper gagal: ${e.message}` });
  });

  child.on("close", (code) => {
    runningJobs.delete(jobId);
    if (code !== 0) {
      updateJob(jobId, { status: "failed", message: "Transcribe gagal (model akan diunduh saat pertama kali)" });
      return;
    }
    try {
      const data = JSON.parse(fs.readFileSync(outPath, "utf8"));
      db.insert(clipperTranscripts)
        .values({
          videoId,
          lang: data.lang || "",
          text: data.text || "",
          segmentsJson: JSON.stringify(data.segments || []),
          model: "faster-whisper small",
        })
        .run();
      db.update(clipperVideos).set({ status: "transcribed" }).where(eq(clipperVideos.id, videoId)).run();
      updateJob(jobId, { status: "done", progress: 100, message: "Transkrip selesai", videoId });
    } catch (e) {
      updateJob(jobId, { status: "failed", message: e instanceof Error ? e.message : "Parse hasil gagal" });
    }
  });
}

/** Analisa viral — LLM pada transkrip → kandidat potongan + score. */
export async function runAnalyzeJob(jobId: number, videoId: number, opts?: { customPrompt?: string; minLength?: number }): Promise<void> {
  const tr = db.select().from(clipperTranscripts).where(eq(clipperTranscripts.videoId, videoId)).orderBy(sql`id desc`).get();
  if (!tr) {
    updateJob(jobId, { status: "failed", message: "Video belum ditranskrip" });
    return;
  }
  const minLen = opts?.minLength && opts.minLength > 0 ? opts.minLength : 0;
  updateJob(jobId, { status: "running", progress: 5, message: "AI menganalisa potongan viral…" });
  try {
    const model = getChatModel();
    const { text } = await generateText({
      model,
      system:
        "Kamu adalah editor konten viral TikTok/Reels. Analisa transkrip video (dengan timestamp) dan temukan 3-6 POTONGAN yang paling berpotensi viral. " +
        "OUTPUT HANYA JSON (tanpa markdown): {\"summary\":\"ringkasan 1 kalimat\",\"candidates\":[{\"start\":12.5,\"end\":25.0,\"hook_line\":\"kalimat hook\",\"reason\":\"kenapa viral\",\"score\":87,\"emotion\":\"inspirasi\"}]}. score 0-100." +
        (minLen > 0 ? ` Pastikan setiap potongan memiliki durasi minimal ${minLen} detik (end - start >= ${minLen}).` : "") +
        (opts?.customPrompt?.trim() ? `\nInstruksi tambahan dari user (ikuti dengan serius): ${opts.customPrompt.trim().slice(0, 500)}` : ""),
      prompt: `Transkrip video:\n${tr.text.slice(0, 6000)}`,
      temperature: 0.3,
    });
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    db.insert(clipperAnalyses)
      .values({
        videoId,
        summary: String(parsed.summary || "").slice(0, 500),
        candidatesJson: JSON.stringify(parsed.candidates || []),
        model: "deepseek via opencode-go",
      })
      .run();
    db.update(clipperVideos).set({ status: "analyzed" }).where(eq(clipperVideos.id, videoId)).run();
    updateJob(jobId, { status: "done", progress: 100, message: `Analisa selesai: ${(parsed.candidates || []).length} kandidat`, videoId });
  } catch (e) {
    updateJob(jobId, { status: "failed", message: e instanceof Error ? e.message : "Gagal analisa" });
  }
}

/** Clip video via ffmpeg (crop + skala kualitas + teks opsional). */
export async function runClipJob(
  jobId: number,
  videoId: number,
  preset: { ratio: string; captionPosition: string; captionSize: number; captionColor: string; captionBg: string; ctaText: string; ctaPosition: string; ctaColor?: string; ctaSize?: number; ctaBorderSize?: number; ctaBorderColor?: string; showSource?: number; sourcePosition?: string; sourceShowUrl?: number; sourcePrefix?: string; sourceSize?: number; fontFamily?: string; ctaBg?: string; srcBg?: string; captionMode?: string; hookVoice?: number; hookVoiceName?: string; showIntro?: number; introDuration?: number; introBg?: string; introUseVideo?: number; introBorderColor?: string },
  startSec: number,
  endSec: number,
  quality: number,
  meta?: { title?: string; hookLine?: string; tags?: string; score?: number; emotion?: string; reason?: string },
  jobPresetId?: number
): Promise<void> {
  const video = db.select().from(clipperVideos).where(eq(clipperVideos.id, videoId)).get();
  if (!video || !fs.existsSync(video.filePath)) {
    updateJob(jobId, { status: "failed", message: "File video tidak ditemukan" });
    return;
  }
  updateJob(jobId, { status: "running", progress: 2, message: "Menyiapkan ffmpeg…" });

  // Resolusi target per kualitas (9:16 vertical)
  const sizes: Record<number, string> = { 360: "640x1136", 480: "720x1280", 720: "720x1280", 1080: "1080x1920" };
  const target = sizes[quality] ?? "720x1280";
  const crf = quality >= 1080 ? 19 : quality >= 720 ? 21 : 23;

  let vf = "";
  if (preset.ratio === "9:16") {
    vf = "crop=ih*9/16:ih:((iw-ih*9/16)/2):0,scale=" + target;
  } else if (preset.ratio === "1:1") {
    vf = "crop=ih:ih:((iw-ih)/2):0,scale=" + (quality >= 1080 ? "1080x1080" : "720x720");
  } else {
    vf = "scale=" + target;
  }

  // ── Teks & CTA via PNG transparan + overlay (bekerja tanpa drawtext) ──
  const [W, H] = target.split("x").map(Number);
  const ctaPngPath = path.join(CLIP_DIR, `cta_${jobId}.png`);
  let ctaPng: Buffer | null = null;

  const capColor = preset.captionColor || "white";
  const capBgParts = (preset.captionBg || "black@0.4").split("@");
  const capBgColor = capBgParts[0] || "black";
  const capBgAlpha = Number(capBgParts[1]) || 0;

  // ── Caption DINAMIS: layer per segmen transkrip (sinkron dengan timestamp) ──
  const capLayers: { path: string; startRel: number; endRel: number }[] = [];
  if (preset.captionMode !== "off" && preset.captionSize > 0) {
    const tr = db.select().from(clipperTranscripts).where(eq(clipperTranscripts.videoId, videoId)).orderBy(sql`id desc`).get();
    if (tr) {
      let segs: { start: number; end: number; text: string }[] = [];
      try {
        segs = JSON.parse(tr.segmentsJson || "[]");
      } catch {
        segs = [];
      }
      const inRange = segs.filter((s) => s.end >= startSec && s.start <= endSec).slice(0, 12);
      for (let i = 0; i < inRange.length; i++) {
        const s = inRange[i];
        const text = (preset.captionMode === "word" ? s.text.trim().split(/\s+/).filter(Boolean).slice(0, 4).join(" ") : s.text.trim()).slice(0, 120);
        if (!text) continue;
        const buf = await renderCaptionPng(text, { width: W, fontSize: Math.round((preset.captionSize * W) / 720), color: capColor, bgColor: capBgColor, bgAlpha: capBgAlpha, maxChars: 24, fontFamily: preset.fontFamily, highlight: "#22C55E" });
        if (!buf) continue;
        const p = path.join(CLIP_DIR, `cap_${jobId}_${i}.png`);
        fs.writeFileSync(p, buf);
        capLayers.push({ path: p, startRel: Math.max(0, s.start - startSec), endRel: Math.min(endSec - startSec, s.end - startSec) });
      }
    }
    if (capLayers.length === 0) {
      const fb = (meta?.hookLine || video.title.slice(0, 60)).slice(0, 120);
      const buf = await renderCaptionPng(fb, { width: W, fontSize: Math.round((preset.captionSize * W) / 720), color: capColor, bgColor: capBgColor, bgAlpha: capBgAlpha, maxChars: 24, fontFamily: preset.fontFamily, highlight: "#22C55E" });
      if (buf) {
        const p = path.join(CLIP_DIR, `cap_${jobId}.png`);
        fs.writeFileSync(p, buf);
        capLayers.push({ path: p, startRel: 0, endRel: Math.max(1, endSec - startSec) });
      }
    }
  }
  if (preset.ctaText) {
    const ctaBgParts = (preset.ctaBg && preset.ctaBg !== "transparent" ? preset.ctaBg : "transparent").split("@");
    const ctaBgColor = ctaBgParts[0] || "black";
    const ctaBgAlpha = ctaBgParts.length === 2 ? Number(ctaBgParts[1]) || 0 : 0;
    ctaPng = await renderCaptionPng(preset.ctaText, { width: W, fontSize: Math.round(((preset.ctaSize || preset.captionSize + 6) * W) / 720), color: preset.ctaColor || "#FFD400", bgColor: ctaBgColor, bgAlpha: ctaBgAlpha, maxChars: 22, strokeWidth: Math.round(((preset.ctaBorderSize || 0) * W) / 720), strokeColor: preset.ctaBorderColor || "#000000", fontFamily: preset.fontFamily, autoWidth: true, maxWidth: Math.round(W * 0.92) });
  }

  const inputs = ["-y", "-ss", String(startSec), "-to", String(endSec), "-i", video.filePath];

  // Sumber video (channel + URL) — input ekstra
  const srcPngPath = path.join(CLIP_DIR, `src_${jobId}.png`);
  let srcPng: Buffer | null = null;
  if (preset.showSource) {
    const srcParts = [preset.sourcePrefix || ""].filter(Boolean);
    srcParts.push(video.channel || "");
    if (preset.sourceShowUrl !== 0 && video.url) srcParts.push(video.url);
    const srcText = srcParts.filter(Boolean).join("  ");
    if (srcText) {
      const srcBgParts = (preset.srcBg && preset.srcBg !== "transparent" ? preset.srcBg : "transparent").split("@");
      const srcBgColor = srcBgParts[0] || "black";
      const srcBgAlpha = srcBgParts.length === 2 ? Number(srcBgParts[1]) || 0 : 0;
      const srcFs = Math.round(((preset.sourceSize || 16) * W) / 720);
      srcPng = await renderCaptionPng(srcText, { width: W, fontSize: srcFs, color: "#FFFFFF", bgColor: srcBgColor, bgAlpha: srcBgAlpha, maxChars: 52, fontFamily: preset.fontFamily, autoWidth: true, maxWidth: Math.round(W * 0.92) });
    }
  }

  const hasOverlay = capLayers.length > 0 || ctaPng || srcPng;
  let fcParts: string[] = [];
  if (hasOverlay) {
    const parts: string[] = [];
    let idx = 1;
    let prev = "[v0]";
    parts.push(`[0:v]${vf}[v0]`);
    // Posisi rapat: elemen di sisi sama diberi jarak 8px (estimasi tinggi pill)
    const estPngH = (text: string, fs: number): number => {
      const n = Math.max(1, Math.ceil((text.length || 1) / 24));
      return Math.round(n * fs * 1.35 + fs);
    };
    const bothBottom = preset.ctaPosition === "bottom" && preset.sourcePosition === "bottom";
    const bothTop = preset.ctaPosition === "top" && preset.sourcePosition === "top";
    if (srcPng) {
      fs.writeFileSync(srcPngPath, srcPng);
      inputs.push("-i", srcPngPath);
      const ySrc = preset.sourcePosition === "top" ? (bothTop && ctaPng ? Math.round(H * 0.05) : Math.round(H * 0.06)) : bothBottom && ctaPng ? Math.round(H * 0.84 + estPngH(preset.ctaText || "", Math.round(((preset.ctaSize || preset.captionSize + 6) * W) / 720)) + 8) : Math.round(H * 0.92);
      parts.push(`${prev}[${idx}:v]overlay=(W-w)/2:${ySrc}[vS]`);
      prev = "[vS]";
      idx++;
    }
    // Caption dinamis: 1 input PNG per segmen, overlay dengan enable between(t)
    for (const layer of capLayers) {
      inputs.push("-i", layer.path);
      const yCap = preset.captionPosition === "top" ? Math.round(H * 0.07) : preset.captionPosition === "center" ? `(H-h)/2` : Math.round(H * 0.78);
      const s = layer.startRel.toFixed(2);
      const e = layer.endRel.toFixed(2);
      parts.push(`${prev}[${idx}:v]overlay=(W-w)/2:${yCap}:enable='between(t,${s},${e})'[vC${idx}]`);
      prev = `[vC${idx}]`;
      idx++;
    }
    if (ctaPng) {
      fs.writeFileSync(ctaPngPath, ctaPng);
      inputs.push("-i", ctaPngPath);
      const yCta = preset.ctaPosition === "top" ? (bothTop && srcPng ? Math.round(H * 0.05 + estPngH((preset.sourcePrefix || "") + "  " + (video.channel || "") + ((preset.sourceShowUrl !== 0 && video.url) ? "  " + video.url : ""), Math.round(((preset.sourceSize || 16) * W) / 720)) + 8) : Math.round(H * 0.07)) : preset.ctaPosition === "center" ? `(H-h)/2` : bothBottom && srcPng ? Math.round(H * 0.84) : Math.round(H * 0.88);
      parts.push(`${prev}[${idx}:v]overlay=(W-w)/2:${yCta}[vout]`);
      prev = "[vout]";
      idx++;
    }
    if (prev !== "[vout]") parts.push(`${prev}null[vout]`);
    fcParts = parts;
  }

  // ── Intro thumbnail & hook voice (prepend) ──
  let introDur = 0;
  let hookDur = 0;
  let ttsErr = "";
  let introCardH = 0;
  let introCardY = 0;
  const hookText = (meta?.hookLine || "").slice(0, 160);
  const introPath = path.join(CLIP_DIR, `intro_${jobId}.png`);
  const cardPath = path.join(CLIP_DIR, `introcard_${jobId}.png`);
  const hookPath = path.join(CLIP_DIR, `hook_${jobId}.m4a`);

  if (preset.hookVoice && hookText) {
    updateJob(jobId, { message: "Membuat suara hook…" });
    try {
      const voice = preset.hookVoiceName || "id-ID-GadisNeural";
      const mp3Path = path.join(CLIP_DIR, `hook_${jobId}.mp3`);
      await new Promise<void>((res, rej) => {
        const c = spawn(PYTHON, ["scripts/tts.py", hookText, mp3Path, voice], { env: CLEAN_ENV });
        let terr = "";
        c.stderr?.on("data", (d: Buffer) => (terr += String(d)));
        c.on("error", (e) => rej(new Error(`spawn: ${e.message}`)));
        c.on("close", (code) => (code === 0 ? res() : rej(new Error(`tts exit ${code}: ${terr.slice(-150)}`))));
      });
      // Konversi ke M4A/AAC — durasi akurat (mp3 VBR sering salah diukur ffprobe) → sync suara
      const m4aOk = await new Promise<boolean>((res) => {
        const c = spawn("ffmpeg", ["-y", "-i", mp3Path, "-c:a", "aac", "-b:a", "128k", hookPath], { env: CLEAN_ENV });
        c.on("error", () => res(false));
        c.on("close", (x) => res(x === 0));
      });
      if (m4aOk && fs.existsSync(hookPath)) {
        hookDur = await ffprobeDur(hookPath);
      }
      if (!(hookDur > 0.5)) hookDur = 3;
    } catch (e) {
      ttsErr = String(e);
      hookDur = 0;
    }
  }

  if (preset.showIntro) {
    updateJob(jobId, { message: `Membuat thumbnail intro…${ttsErr ? ` (suara hook gagal: ${ttsErr.slice(0, 90)})` : ""}` });
    introDur = hookDur > 0 ? Math.max(hookDur, 1) : Math.max(1, preset.introDuration || 2);
    try {
      // 1) Background: frame video (base64 — librsvg menolak file://) + gradasi + pill sumber
      let bgImage = "";
      const framePath = path.join(CLIP_DIR, `frame_${jobId}.jpg`);
      if (preset.introUseVideo !== 0 && video.filePath && fs.existsSync(video.filePath)) {
        const t = Math.max(0, startSec + 0.5);
        const code = await new Promise<number>((res) => {
          const c = spawn("ffmpeg", ["-ss", String(t), "-i", video.filePath, "-frames:v", "1", "-vf", `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`, "-q:v", "2", "-y", framePath], { env: CLEAN_ENV });
          c.on("error", () => res(1));
          c.on("close", (x) => res(x ?? 1));
        });
        if (code === 0 && fs.existsSync(framePath)) {
          try {
            bgImage = `data:image/jpeg;base64,${fs.readFileSync(framePath).toString("base64")}`;
          } catch {
            bgImage = "";
          }
        }
      }
      const bg = preset.introBg || "#0D9488";
      const border = preset.introBorderColor || "#3B82F6";
      const srcPill = `Source YT: ${escXml(video.channel || "YouTube")}`;
      const srcPillW = Math.round(W * 0.52);
      const bgSvg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
        (bgImage
          ? `<image href="${bgImage}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`
          : `<rect width="${W}" height="${H}" fill="${escXml(bg)}"/>`) +
        `<rect width="${W}" height="${H}" fill="url(#g)"/>` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.35" stop-color="black" stop-opacity="0"/><stop offset="1" stop-color="black" stop-opacity="0.6"/></linearGradient></defs>` +
        // Pill sumber di atas tengah
        `<rect x="${Math.round((W - srcPillW) / 2)}" y="${Math.round(H * 0.05)}" width="${srcPillW}" height="${Math.round(H * 0.05)}" rx="${Math.round(H * 0.025)}" fill="black" fill-opacity="0.45"/>` +
        `<text x="${W / 2}" y="${Math.round(H * 0.05) + Math.round(H * 0.032)}" font-family="Inter, Arial, sans-serif" font-size="${Math.round(W * 0.026)}" font-weight="600" fill="#FFFFFF" text-anchor="middle">${srcPill}</text>` +
        "</svg>";
      await sharp(Buffer.from(bgSvg)).png().toBuffer().then((buf) => fs.writeFileSync(introPath, buf));

      // 2) Card speech bubble (transparan) — auto-height mengikuti teks, slide dari atas
      const lines = wrapText(hookText || video.title.slice(0, 80), 14).slice(0, 3);
      const cardX = Math.round(W * 0.07);
      const cardW = Math.round(W * 0.86);
      const padX = Math.round(W * 0.06);
      const padY = Math.round(W * 0.05);
      const fontSize = Math.round(W * 0.062);
      const lineH = Math.round(fontSize * 1.32);
      const cardH = Math.round(padY * 2 + lines.length * lineH);
      introCardH = cardH;
      const cardY = Math.round(H * 0.36 - cardH / 2);
      introCardY = cardY;
      const textStartY = cardY + padY + fontSize;
      const renderLine = (l: string): string => {
        const words = l.split(" ");
        let li = -1;
        let longest = 0;
        words.forEach((w, k) => {
          const len = w.replace(/[^a-zA-Z0-9]/g, "").length;
          if (len > longest) {
            longest = len;
            li = k;
          }
        });
        if (li < 0 || longest < 5) return escXml(l);
        return words
          .map((w, k) => (k === li ? `<tspan fill="#22C55E">${escXml(w)}</tspan>` : escXml(w)))
          .join(" ");
      };
      const texts = lines
        .map(
          (l, i) =>
            `<text x="${W / 2}" y="${textStartY + i * lineH}" font-family="Inter, Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#1E293B" text-anchor="middle">${renderLine(l)}</text>`
        )
        .join("");
      const cardSvg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
        // Shadow card
        `<rect x="${cardX + 5}" y="${cardY + 8}" width="${cardW}" height="${cardH}" rx="26" fill="black" fill-opacity="0.18"/>` +
        // Card putih
        `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="26" fill="#FFFFFF"/>` +
        texts +
        // Badge kutipan DI DEPAN card (digambar terakhir)
        `<circle cx="${W / 2}" cy="${cardY}" r="${Math.round(W * 0.038)}" fill="${escXml(border)}"/>` +
        `<text x="${W / 2}" y="${cardY + Math.round(W * 0.03)}" font-family="Arial, sans-serif" font-size="${Math.round(W * 0.044)}" font-weight="bold" fill="#FFFFFF" text-anchor="middle">“</text>` +
        "</svg>";
      const cardPath = path.join(CLIP_DIR, `introcard_${jobId}.png`);
      await sharp(Buffer.from(cardSvg)).png().toBuffer().then((buf) => fs.writeFileSync(cardPath, buf));
    } catch {
      introDur = 0;
    }
  }

  // Input tambahan: intro (bg loop + card) & hook audio — idx = jumlah input saat ini
  const introIdx = inputs.filter((x) => x === "-i").length;
  const cardIdx = introIdx + 1;
  const hookIdx = introIdx + 2;
  if (introDur > 0) {
    inputs.push("-loop", "1", "-t", String(introDur), "-i", introPath);
    inputs.push("-i", cardPath);
  }
  if (hookDur > 0) inputs.push("-i", hookPath);

  const safeTitle = video.title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 60);
  const outFile = path.join(CLIP_DIR, `${safeTitle}_${startSec}-${endSec}_${quality}p.mp4`);

  // Filter final: gabung intro (video) + clip; audio hook + clip audio
  const clipDur = endSec - startSec;
  const totalDur = introDur + clipDur;
  if (introDur > 0) {
    const fc = [...fcParts];
    // Background + card (slide dari atas ke posisi, 0.7s)
    fc.push(`[${introIdx}:v]scale=${W}:${H},fps=30,setsar=1[bgv]`);
    fc.push(`[${cardIdx}:v]scale=${W}:${H}[cd]`);
    fc.push(`[bgv][cd]overlay=(W-w)/2:y='-${introCardH} + (${introCardH} + ${introCardY})*min(1,t/0.7)'[introV]`);
    if (hasOverlay) fc.push(`[vout]fps=30,setsar=1[vc]`);
    else fc.push(`[0:v]${vf},fps=30,setsar=1[vc]`);
    fc.push(`[introV][vc]concat=n=2:v=1:a=0[vt]`);
    const maps = ["[vt]"];
    if (hookDur > 0) {
      fc.push(`[${hookIdx}:a]atrim=0:${introDur.toFixed(2)},apad=whole_dur=${introDur.toFixed(2)},aformat=sample_rates=44100:channel_layouts=stereo[a0]`);
      fc.push(`[0:a]atrim=0:${clipDur.toFixed(2)},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo[a1]`);
      fc.push(`[a0][a1]concat=n=2:v=0:a=1[aout]`);
      maps.push("[aout]");
    } else {
      maps.push("0:a?");
    }
    inputs.push("-filter_complex", fc.join(";"));
    for (const m of maps) inputs.push("-map", m);
  } else if (hasOverlay) {
    inputs.push("-filter_complex", fcParts.join(";"), "-map", "[vout]", "-map", "0:a?");
  } else {
    inputs.push("-vf", vf);
  }

  const args = [
    ...inputs,
    "-c:v", "libx264",
    "-crf", String(crf),
    "-preset", "medium",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    outFile,
  ];
  const child = spawn("ffmpeg", args);
  runningJobs.set(jobId, child);
  let lastPct = 2;
  let ffmpegErr = "";

  child.stderr.on("data", (d: Buffer) => {
    const line = String(d);
    const m = line.match(/time=(\d+):(\d+):(\d+\.\d+)/);
    if (m) {
      const secs = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
      const total = Math.max(1, (endSec - startSec) + introDur);
      lastPct = Math.min(99, Math.round((secs / total) * 100));
      updateJob(jobId, { progress: lastPct, message: `Clipping… ${lastPct}%` });
    }
    if (ffmpegErr.length < 20000) ffmpegErr += line;
  });

  child.on("error", (e) => {
    runningJobs.delete(jobId);
    updateJob(jobId, { status: "failed", message: `ffmpeg: ${e.message}` });
  });

  child.on("close", (code) => {
    runningJobs.delete(jobId);
    if (code !== 0 || !fs.existsSync(outFile)) {
      updateJob(jobId, { status: "failed", message: `Clipping gagal: ${ffmpegErr.replace(/\n+/g, " | ").slice(-320)}` });
      return;
    }
    const size = fs.statSync(outFile).size;
    db.insert(clipperClips)
      .values({
        videoId,
        startSec,
        endSec,
        quality,
        presetId: jobPresetId ?? 0,
        filePath: outFile,
        sizeBytes: size,
        status: "done",
        title: meta?.title?.slice(0, 120) ?? "",
        hookLine: meta?.hookLine?.slice(0, 200) ?? "",
        tags: meta?.tags?.slice(0, 300) ?? "",
        score: meta?.score ?? 0,
        emotion: meta?.emotion?.slice(0, 40) ?? "",
        reason: meta?.reason?.slice(0, 300) ?? "",
      })
      .run();
    updateJob(jobId, { status: "done", progress: 100, message: `Clip ${quality}p siap`, videoId });
  });
}

function formatSpeed(bps: number): string {
  if (!Number.isFinite(bps) || bps <= 0) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bps;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${u[i]}`;
}

/* ── Render teks → PNG transparan (pengganti drawtext via overlay) ── */

const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur.trim());
  return lines.slice(0, 8);
}

/** Font yang di-bundle (public/fonts) — didaftarkan ke fontconfig agar dirender librsvg. */
const FONT_DIR = path.join(process.cwd(), "public", "fonts");
const BUNDLED_FONTS: Record<string, { faces: { file: string; weight: number }[] }> = {
  "Inter": { faces: [{ file: "Inter-Regular.ttf", weight: 400 }, { file: "Inter-Bold.ttf", weight: 700 }] },
  "Plus Jakarta Sans": { faces: [{ file: "PlusJakartaSans.ttf", weight: 400 }, { file: "PlusJakartaSans.ttf", weight: 700 }] },
  "Anton": { faces: [{ file: "Anton-Regular.ttf", weight: 400 }, { file: "Anton-Regular.ttf", weight: 700 }] },
};
const FONT_OPTIONS = ["Arial", "Inter", "Plus Jakarta Sans", "Anton", "Georgia", "Courier", "Impact"] as const;
void FONT_OPTIONS;

/** @font-face cadangan (file:// kadang diabaikan librsvg; font utama via fontconfig sistem). */
function fontFaceStyle(fontFamily: string): string {
  const b = BUNDLED_FONTS[fontFamily];
  if (!b) return "";
  const faces = b.faces
    .map(
      (f) =>
        `@font-face{font-family:'${fontFamily}';font-weight:${f.weight};src:url('file://${FONT_DIR}/${f.file}') format('truetype');}`
    )
    .join("");
  return `<style>${faces}</style>`;
}

/** Durasi file audio/video via ffprobe (detik). */
function ffprobeDur(p: string): Promise<number> {
  return new Promise((res) => {
    const c = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], { env: CLEAN_ENV });
    let o = "";
    c.stdout.on("data", (d: Buffer) => (o += String(d)));
    c.on("error", () => res(0));
    c.on("close", () => res(parseFloat(o.trim()) || 0));
  });
}

/** Render PNG teks transparan (SVG → sharp). autoWidth = lebar mengikuti teks + bg pill rounded. highlight = warna kata terpanjang (tspan). */
async function renderCaptionPng(
  text: string,
  opts: { width: number; fontSize: number; color: string; bgColor: string; bgAlpha: number; maxChars: number; strokeWidth?: number; strokeColor?: string; fontFamily?: string; highlight?: string; autoWidth?: boolean; maxWidth?: number }
): Promise<Buffer | null> {
  try {
    const lines = wrapText(text, opts.maxChars);
    const lineH = opts.fontSize * 1.35;
    const pad = opts.fontSize * 0.5;
    const h = Math.min(Math.round(lines.length * lineH + pad * 2), opts.width * 2);
    // Lebar: mengikuti teks (pill) bila autoWidth, dengan cap maxWidth
    const wChars = Math.max(...lines.map((l) => l.length));
    const autoW = opts.autoWidth ? Math.min(Math.max(Math.round(wChars * opts.fontSize * 0.58 + pad * 2), Math.round(opts.fontSize * 2.2)), opts.maxWidth || opts.width) : opts.width;
    const rx = opts.autoWidth ? Math.round(h / 2) : 0;
    const startY = pad + opts.fontSize * 0.8;
    const stroke = opts.strokeWidth && opts.strokeWidth > 0 ? ` stroke="${escXml(opts.strokeColor || "#000000")}" stroke-width="${opts.strokeWidth}" paint-order="stroke"` : "";
    const fontStack = opts.fontFamily && opts.fontFamily !== "Arial" ? `${escXml(opts.fontFamily)}, Arial, Helvetica, sans-serif` : "Arial, Helvetica, sans-serif";
    // Highlight kata terpanjang (huruf & angka) dengan warna khusus
    const hl = opts.highlight || "";
    const renderLine = (l: string): string => {
      if (!hl) return escXml(l);
      const words = l.split(" ");
      let li = -1;
      let longest = 0;
      words.forEach((w, k) => {
        const len = w.replace(/[^a-zA-Z0-9]/g, "").length;
        if (len > longest) {
          longest = len;
          li = k;
        }
      });
      if (li < 0 || longest < 5) return escXml(l);
      return words
        .map((w, k) => (k === li ? `<tspan fill="${escXml(hl)}">${escXml(w)}</tspan>` : escXml(w)))
        .join(" ");
    };
    const textSvg = lines
      .map(
        (l, i) =>
          `<text x="${autoW / 2}" y="${startY + i * lineH}" font-family="${fontStack}" font-size="${opts.fontSize}" font-weight="bold" fill="${escXml(opts.color)}" text-anchor="middle"${stroke}>${renderLine(l)}</text>`
      )
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${autoW}" height="${h}">` +
      fontFaceStyle(opts.fontFamily || "Arial") +
      (opts.bgAlpha > 0 ? `<rect width="100%" height="100%" fill="${escXml(opts.bgColor)}" fill-opacity="${opts.bgAlpha}" rx="${rx}"/>` : "") +
      textSvg + "</svg>";
    return await sharp(Buffer.from(svg)).png().toBuffer();
  } catch {
    return null;
  }
}
