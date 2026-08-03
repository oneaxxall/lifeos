"use client";

import * as React from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Copy,
  Download,
  Film,
  FolderOpen,
  HardDrive,
  Loader2,
  Palette,
  Play,
  RefreshCcw,
  Scissors,
  Search,
  Sparkles,
  Star,
  Trash2,
  Video,
  Wand2,
  XCircle,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Job {
  id: number;
  type: string;
  url: string;
  status: string;
  progress: number;
  message: string;
  videoId: number;
  createdAt?: string;
}

interface Video {
  id: number;
  title: string;
  channel: string;
  durationSec: number;
  sizeBytes: number;
  status: string;
  exists: boolean;
  createdAt: string;
  thumbnail?: string;
}

interface Candidate {
  start: number;
  end: number;
  hook_line: string;
  reason: string;
  score: number;
  emotion: string;
}

interface Preset {
  id: number;
  name: string;
  ratio: string;
  captionPosition: string;
  captionSize: number;
  captionColor: string;
  captionBg: string;
  ctaText: string;
  ctaPosition: string;
  ctaColor: string;
  ctaSize: number;
  ctaBorderSize?: number;
  ctaBorderColor?: string;
  showSource?: number;
  sourcePosition?: string;
  sourceShowUrl?: number;
  sourcePrefix?: string;
  sourceSize?: number;
  srcBg?: string;
  fontFamily?: string;
  captionMode?: string;
  ctaBg?: string;
  hookVoice?: number;
  hookVoiceName?: string;
  showIntro?: number;
  introDuration?: number;
  introBg?: string;
  introUseVideo?: number;
  introBorderColor?: string;
  isDefault: number;
}

interface Clip {
  id: number;
  videoId: number;
  presetId?: number;
  startSec: number;
  endSec: number;
  quality: number;
  filePath: string;
  sizeBytes: number;
  status: string;
  exists: boolean;
  createdAt: string;
  title?: string;
  hookLine?: string;
  tags?: string;
  score?: number;
  emotion?: string;
  reason?: string;
}

const fmtBytes = (b: number) => {
  if (!Number.isFinite(b) || b <= 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${u[i]}`;
};

const fmtDur = (s: number) => {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const STATUS_STYLE: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  done: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  cancelled: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  queued: "Antrean",
  running: "Berjalan",
  done: "Selesai",
  failed: "Gagal",
  cancelled: "Batal",
};

const TYPE_STYLE: Record<string, string> = {
  download: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  transcribe: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  analyze: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  clip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const VIDEO_STATUS_LABEL: Record<string, string> = {
  downloaded: "Terunduh",
  transcribed: "Transkrip ✓",
  analyzed: "Analisa ✓",
};

const EMPTY_PRESET = {
  name: "",
  ratio: "9:16",
  captionPosition: "bottom",
  captionSize: 36,
  captionColor: "white",
  captionBg: "black@0.4",
  ctaText: "FOLLOW for more!",
  ctaPosition: "bottom",
  ctaColor: "#FFD400",
  ctaSize: 18,
  ctaBorderSize: 0,
  ctaBorderColor: "#000000",
  captionText: "Transkrip berjalan…",
  showSource: false,
  sourcePosition: "bottom",
  sourceText: "@Channel · youtube.com/watch?v=…",
  sourceShowUrl: true,
  sourcePrefix: "Sumber YouTube :",
  sourceSize: 14,
  srcBg: "black@0.55",
  fontFamily: "Inter",
  captionMode: "sentence",
  ctaBg: "black@0.5",
  hookVoice: false,
  hookVoiceName: "id-ID-GadisNeural",
  showIntro: false,
  introDuration: 2,
  introBg: "#0D9488",
  introUseVideo: true,
  introBorderColor: "#3B82F6",
};

const QUALITIES = [360, 480, 720, 1080];

/** Konversi baris preset DB → bentuk form preview (satu sumber kebenaran). */
function presetToForm(p: Preset): typeof EMPTY_PRESET {
  return {
    name: p.name,
    ratio: p.ratio,
    captionPosition: p.captionPosition,
    captionSize: p.captionSize,
    captionColor: p.captionColor,
    captionBg: p.captionBg,
    ctaText: p.ctaText ?? "",
    ctaPosition: p.ctaPosition,
    ctaColor: p.ctaColor || "#FFD400",
    ctaSize: p.ctaSize || 30,
    ctaBorderSize: p.ctaBorderSize || 0,
    ctaBorderColor: p.ctaBorderColor || "#000000",
    ctaBg: p.ctaBg || "black@0.5",
    hookVoice: !!p.hookVoice,
    hookVoiceName: p.hookVoiceName || "id-ID-GadisNeural",
    showIntro: !!p.showIntro,
    introDuration: p.introDuration || 2,
    introBg: p.introBg || "#0D9488",
    introUseVideo: p.introUseVideo !== 0,
    introBorderColor: p.introBorderColor || "#3B82F6",
    captionText: "Transkrip berjalan…",
    captionMode: (p.captionMode as "sentence" | "word" | "off") || "sentence",
    showSource: !!p.showSource,
    sourcePosition: (p.sourcePosition as "top" | "bottom") || "bottom",
    sourceText: "@Channel · youtube.com/watch?v=…",
    sourceShowUrl: p.sourceShowUrl !== 0,
    sourcePrefix: p.sourcePrefix || "Sumber YouTube :",
    sourceSize: p.sourceSize || 16,
    srcBg: p.srcBg || "black@0.55",
    fontFamily: (p.fontFamily as "Arial" | "Inter" | "Plus Jakarta Sans" | "Anton" | "Georgia" | "Courier" | "Impact") || "Inter",
  };
}

/** Konversi "black@0.4" → warna dengan alpha hex. */
function mixAlpha(color: string, alpha: number): string {
  if (!color || color.startsWith("#")) {
    const hex = (color || "#000000").replace("#", "");
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex.padEnd(6, "0");
    return `#${full}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
  }
  return color;
}

/* ── Komponen kontrol Preset Builder ── */

const POSITIONS = [
  { value: "top", label: "Atas" },
  { value: "center", label: "Tengah" },
  { value: "bottom", label: "Bawah" },
] as const;

function Segmented<T extends string>({ options, value, onChange }: { options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg border bg-muted/50 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
            value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Slider({ label, value, min, max, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
    </div>
  );
}

const SWATCHES = ["#FFD400", "#FF4D4D", "#4DA3FF", "#4DFF88", "#FF7A00", "#E94DFF", "#FFFFFF"];

function ColorField({ label, value, onChange, swatches = SWATCHES }: { label: string; value: string; onChange: (v: string) => void; swatches?: string[] }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-1.5">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={c}
            className={cn("size-6 shrink-0 rounded-full border border-black/10 transition-transform hover:scale-110", value.toLowerCase() === c.toLowerCase() && "ring-2 ring-primary ring-offset-1")}
            style={{ backgroundColor: c }}
          />
        ))}
        <label className="relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-full border border-black/10" style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }} title="Pilih warna kustom">
          <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#FFD400"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
        </label>
        <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-muted-foreground">{value}</span>
      </div>
    </div>
  );
}

/** Kanvas preview — phone mockup dengan teks & CTA (live, akurat = hasil asli). */
function PhoneCanvas({ form, size = "md" }: { form: typeof EMPTY_PRESET; size?: "sm" | "md" | "lg" }) {
  const tall = form.ratio === "9:16";
  const square = form.ratio === "1:1";
  const wClass = size === "lg" ? "w-full max-w-48" : size === "md" ? "w-full max-w-28" : "w-full max-w-20";
  const wOrig = size === "lg" ? "w-full max-w-sm" : size === "md" ? "w-full max-w-44" : "w-full max-w-32";
  const capPos = form.captionPosition === "top" ? "top-[7%]" : form.captionPosition === "center" ? "top-1/2 -translate-y-1/2" : "bottom-[10%]";
  const ctaPos = form.ctaPosition === "top" ? "top-[7%]" : form.ctaPosition === "center" ? "top-1/2 -translate-y-1/2" : "bottom-[6%]";
  const srcPos = form.sourcePosition === "top" ? "top-[2.5%]" : "bottom-[2.5%]";
  const bgParts = (form.captionBg || "black@0.4").split("@");
  const bgColor = mixAlpha(bgParts[0] || "black", Number(bgParts[1]) || 0.4);
  const ctaBgParts = (form.ctaBg && form.ctaBg !== "transparent" ? form.ctaBg : "transparent").split("@");
  const ctaBgColor = ctaBgParts[1] !== undefined ? mixAlpha(ctaBgParts[0] || "black", Number(ctaBgParts[1]) || 0.5) : "transparent";
  const srcBgParts = (form.srcBg && form.srcBg !== "transparent" ? form.srcBg : "transparent").split("@");
  const srcBgColor = srcBgParts[1] !== undefined ? mixAlpha(srcBgParts[0] || "black", Number(srcBgParts[1]) || 0.55) : "transparent";
  const capSize = Math.max(8, Math.round(form.captionSize * (tall ? 0.28 : square ? 0.24 : 0.2)));
  const ctaSize = Math.max(6, Math.round((form.ctaSize || 30) * (tall ? 0.24 : square ? 0.2 : 0.18)));
  const srcSize = Math.max(4.5, Math.round(18 * (tall ? 0.14 : square ? 0.12 : 0.1)));
  const fontFamily = form.fontFamily === "Arial" ? "sans-serif" : form.fontFamily;
  // Anti-overlap preview: jika CTA & sumber di bawah → CTA naik
  const bothBottom = form.ctaPosition === "bottom" && form.sourcePosition === "bottom" && form.showSource && form.ctaText;
  const bothTop = form.ctaPosition === "top" && form.sourcePosition === "top" && form.showSource && form.ctaText;
  const effCtaPos = bothBottom ? "bottom-[18%]" : bothTop ? "top-[16%]" : ctaPos;
  const srcText = form.showSource ? (form.sourceShowUrl === false ? `${form.sourcePrefix || ""} @Channel`.trim() : form.sourceText || "@Channel · youtube.com/watch?v=…") : "";
  const capText = form.captionMode === "off" ? "" : form.captionMode === "word" ? "Kata kunci…" : form.captionText || "Transkrip berjalan…";

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border-[5px] border-zinc-800 bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-950 shadow-2xl", tall ? `aspect-[9/16] ${wClass}` : square ? `aspect-square ${wClass}` : `aspect-video ${wOrig}`)}>
      {/* Notch */}
      <div className="absolute left-1/2 top-1.5 z-20 h-1 w-10 -translate-x-1/2 rounded-full bg-zinc-900" />
      {/* Video dummy */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="size-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white/70" style={{ fontSize: 14 }}>▶</div>
      </div>
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/5 to-transparent" />
      {/* Sumber */}
      {form.showSource && (
        <div className={cn("absolute left-1/2 z-10 w-full -translate-x-1/2 px-2 text-center", srcPos)}>
          <span className="inline-block rounded-md px-2 py-0.5 font-medium text-white/90" style={{ fontSize: srcSize, fontFamily, backgroundColor: srcBgColor }}>
            {srcText || "@Channel · youtube.com"}
          </span>
        </div>
      )}
      {/* CTA */}
      {form.ctaText && (
        <div className={cn("absolute left-1/2 z-10 -translate-x-1/2", effCtaPos)}>
          <span
            className="inline-block rounded-md px-2 py-1 font-bold"
            style={{ color: form.ctaColor, fontSize: ctaSize, fontFamily, backgroundColor: ctaBgColor, borderWidth: Math.max(0, Math.round((form.ctaBorderSize || 0) * (tall ? 0.1 : 0.08))), borderStyle: (form.ctaBorderSize || 0) > 0 ? "solid" : "none", borderColor: form.ctaBorderColor }}
          >
            {form.ctaText}
          </span>
        </div>
      )}
      {/* Caption */}
      {capText && (
        <div className={cn("absolute left-1/2 z-10 w-full -translate-x-1/2 px-2", capPos)}>
          <span
            className="block text-center font-bold leading-snug"
            style={{ color: form.captionColor || "white", fontSize: capSize, fontFamily, backgroundColor: bgParts[1] !== undefined ? bgColor : "transparent", padding: bgParts[1] !== undefined ? "4px 8px" : 0, borderRadius: 6 }}
          >
            {capText}
          </span>
        </div>
      )}
    </div>
  );
}

/** Preset Builder — kanvas preview kiri + panel kontrol kanan. */
function PresetBuilder({ form, setForm, onSave, onCancel, saving, editing }: { form: typeof EMPTY_PRESET; setForm: (f: typeof EMPTY_PRESET) => void; onSave: () => void; onCancel: () => void; saving: boolean; editing: boolean }) {
  const set = <K extends keyof typeof EMPTY_PRESET>(k: K, v: (typeof EMPTY_PRESET)[K]) => setForm({ ...form, [k]: v });
  const res = form.ratio === "9:16" ? "1080×1920" : form.ratio === "1:1" ? "1080×1080" : "1920×1080";
  return (
    <div className="space-y-4 border-t p-4">
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Kiri: kanvas */}
        <div className="flex shrink-0 flex-col gap-2 self-start rounded-xl border bg-muted/40 p-4 lg:w-60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preview</p>
          <div className="flex items-center justify-center py-2">
            <PhoneCanvas form={form} size="lg" />
          </div>
          <p className="text-center font-mono text-[9px] text-muted-foreground">{res} · {form.ratio}</p>
          <p className="text-center text-[9px] text-muted-foreground">Update otomatis saat kamu edit</p>
        </div>

        {/* Kanan: kontrol */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Umum */}
          <section className="space-y-2.5 rounded-xl border bg-card p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Umum</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Nama preset</label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Viral Hook 9:16" className="h-9" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Rasio</label>
                <Segmented
                  options={[{ value: "9:16", label: "9:16" }, { value: "1:1", label: "1:1" }, { value: "original", label: "16:9" }]}
                  value={form.ratio}
                  onChange={(v) => set("ratio", v)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Font</label>
                <Select value={form.fontFamily} onValueChange={(v) => set("fontFamily", v)}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Pilih font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter (default)</SelectItem>
                    <SelectItem value="Plus Jakarta Sans">Jakarta Sans</SelectItem>
                    <SelectItem value="Anton">Anton (gaya Impact)</SelectItem>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Impact">Impact</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="Courier">Courier</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-0.5 text-[8px] text-muted-foreground">Berlaku: caption · CTA · sumber</p>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Teks transkrip (contoh)</label>
                <Input value={form.captionText} onChange={(e) => set("captionText", e.target.value)} placeholder="Transkrip berjalan…" className="h-9" />
              </div>
            </div>
          </section>

          {/* Caption */}
          <section className="space-y-2.5 rounded-xl border bg-card p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Caption</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Mode teks</label>
                <Segmented
                  options={[{ value: "sentence", label: "Perkalimat" }, { value: "word", label: "Perkata" }, { value: "off", label: "Matikan" }]}
                  value={form.captionMode as "sentence" | "word" | "off"}
                  onChange={(v) => set("captionMode", v)}
                />
                <p className="mt-0.5 text-[8px] text-muted-foreground">Teks diambil dari transkrip asli video</p>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Posisi</label>
                <Segmented options={POSITIONS} value={form.captionPosition as "top" | "center" | "bottom"} onChange={(v) => set("captionPosition", v)} />
              </div>
              <div className="flex items-end pb-1">
                <Slider label="Ukuran teks" value={form.captionSize} min={14} max={80} onChange={(v) => set("captionSize", v)} suffix="px" />
              </div>
              <div className="sm:col-span-2">
                <ColorField label="Warna teks" value={form.captionColor} onChange={(v) => set("captionColor", v)} swatches={["#FFFFFF", "#FFD400", "#FF4D4D", "#4DA3FF", "#4DFF88", "#000000"]} />
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-medium text-muted-foreground">Background kotak teks</label>
                  <input
                    type="checkbox"
                    checked={form.captionBg.includes("@")}
                    onChange={(e) => set("captionBg", e.target.checked ? "black@0.45" : "transparent")}
                    className="size-3.5 accent-primary"
                  />
                </div>
                {form.captionBg.includes("@") && (
                  <div className="mt-2 flex items-center gap-3">
                    <ColorField label="Warna background" value={form.captionBg.split("@")[0] || "#000000"} onChange={(v) => set("captionBg", `${v}@${form.captionBg.split("@")[1] || "0.45"}`)} swatches={["#000000", "#0D9488", "#1E293B", "#7C3AED"]} />
                    <div className="flex-1">
                      <Slider label="Opacity" value={Math.round(Number(form.captionBg.split("@")[1] || 0.45) * 100)} min={10} max={90} onChange={(v) => set("captionBg", `${form.captionBg.split("@")[0] || "black"}@${(v / 100).toFixed(2)}`)} suffix="%" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="space-y-2.5 rounded-xl border bg-card p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CTA</p>
              <input
                type="checkbox"
                checked={!!form.ctaText}
                onChange={(e) => set("ctaText", e.target.checked ? form.ctaText || "FOLLOW for more!" : "")}
                className="size-3.5 accent-primary"
              />
            </div>
            {form.ctaText && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Teks CTA</label>
                  <Input value={form.ctaText} onChange={(e) => set("ctaText", e.target.value)} placeholder="FOLLOW for more!" className="h-9" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Posisi</label>
                  <Segmented options={POSITIONS} value={form.ctaPosition as "top" | "center" | "bottom"} onChange={(v) => set("ctaPosition", v)} />
                </div>
                <div className="flex items-end pb-1">
                  <Slider label="Ukuran" value={form.ctaSize} min={14} max={60} onChange={(v) => set("ctaSize", v)} suffix="px" />
                </div>
                <div className="sm:col-span-2">
                  <ColorField label="Warna CTA" value={form.ctaColor} onChange={(v) => set("ctaColor", v)} />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-medium text-muted-foreground">Background CTA</label>
                    <input
                      type="checkbox"
                      checked={form.ctaBg.includes("@")}
                      onChange={(e) => set("ctaBg", e.target.checked ? "black@0.5" : "transparent")}
                      className="size-3.5 accent-primary"
                    />
                  </div>
                  {form.ctaBg.includes("@") && (
                    <div className="mt-2 flex items-center gap-3">
                      <ColorField label="Warna background" value={form.ctaBg.split("@")[0] || "#000000"} onChange={(v) => set("ctaBg", `${v}@${form.ctaBg.split("@")[1] || "0.5"}`)} swatches={["#000000", "#0D9488", "#1E293B", "#7C3AED"]} />
                      <div className="flex-1">
                        <Slider label="Opacity" value={Math.round(Number(form.ctaBg.split("@")[1] || 0.5) * 100)} min={10} max={90} onChange={(v) => set("ctaBg", `${form.ctaBg.split("@")[0] || "black"}@${(v / 100).toFixed(2)}`)} suffix="%" />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Slider label="Border" value={form.ctaBorderSize} min={0} max={10} onChange={(v) => set("ctaBorderSize", v)} suffix="px" />
                </div>
                <div className="flex items-end">
                  <ColorField label="Warna border" value={form.ctaBorderColor} onChange={(v) => set("ctaBorderColor", v)} swatches={["#000000", "#FFFFFF", "#FF4D4D", "#0D9488", "#4DA3FF"]} />
                </div>
              </div>
            )}
          </section>
          {/* Sumber */}
          <section className="space-y-2.5 rounded-xl border bg-card p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sumber</p>
              <input
                type="checkbox"
                checked={form.showSource}
                onChange={(e) => set("showSource", e.target.checked)}
                className="size-3.5 accent-primary"
              />
            </div>
            <p className="text-[9px] leading-relaxed text-muted-foreground">Cantumkan nama channel & URL video di dalam clip — kredit ke sumber asli.</p>
            {form.showSource && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Teks kustom sebelum channel</label>
                  <Input value={form.sourcePrefix} onChange={(e) => set("sourcePrefix", e.target.value)} placeholder="Sumber YouTube :" className="h-9" />
                  <p className="mt-0.5 text-[8px] text-muted-foreground">Contoh: &quot;Sumber YouTube : jawed&quot;</p>
                </div>
                <div>
                  <Slider label="Ukuran teks sumber" value={form.sourceSize} min={10} max={30} onChange={(v) => set("sourceSize", v)} suffix="px" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Posisi</label>
                  <Segmented
                    options={[{ value: "bottom", label: "Bawah" }, { value: "top", label: "Atas" }]}
                    value={form.sourcePosition as "top" | "bottom"}
                    onChange={(v) => set("sourcePosition", v)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                  <label className="text-[10px] font-medium text-muted-foreground">Tampilkan URL sumber</label>
                  <input
                    type="checkbox"
                    checked={form.sourceShowUrl}
                    onChange={(e) => set("sourceShowUrl", e.target.checked)}
                    className="size-3.5 accent-primary"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                  <label className="text-[10px] font-medium text-muted-foreground">Background sumber</label>
                  <input
                    type="checkbox"
                    checked={form.srcBg.includes("@")}
                    onChange={(e) => set("srcBg", e.target.checked ? "black@0.55" : "transparent")}
                    className="size-3.5 accent-primary"
                  />
                </div>
                {form.srcBg.includes("@") && (
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <ColorField label="Warna background" value={form.srcBg.split("@")[0] || "#000000"} onChange={(v) => set("srcBg", `${v}@${form.srcBg.split("@")[1] || "0.55"}`)} swatches={["#000000", "#0D9488", "#1E293B", "#7C3AED"]} />
                    <div className="flex-1">
                      <Slider label="Opacity" value={Math.round(Number(form.srcBg.split("@")[1] || 0.55) * 100)} min={10} max={90} onChange={(v) => set("srcBg", `${form.srcBg.split("@")[0] || "black"}@${(v / 100).toFixed(2)}`)} suffix="%" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-2.5 rounded-xl border bg-card p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Intro &amp; Hook</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                <label className="text-[10px] font-medium text-muted-foreground">Suara hook AI (voice-over di awal)</label>
                <input
                  type="checkbox"
                  checked={form.hookVoice}
                  onChange={(e) => set("hookVoice", e.target.checked)}
                  className="size-3.5 accent-primary"
                />
              </div>
              {form.hookVoice && (
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Suara</label>
                  <Select value={form.hookVoiceName} onValueChange={(v) => set("hookVoiceName", v)}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Pilih suara" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id-ID-GadisNeural">Gadis (wanita)</SelectItem>
                      <SelectItem value="id-ID-ArdiNeural">Ardi (pria)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-0.5 text-[8px] text-muted-foreground">Membaca hook_line dari analisa viral</p>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                <label className="text-[10px] font-medium text-muted-foreground">Thumbnail intro di awal</label>
                <input
                  type="checkbox"
                  checked={form.showIntro}
                  onChange={(e) => set("showIntro", e.target.checked)}
                  className="size-3.5 accent-primary"
                />
              </div>
              {form.showIntro && (
                <>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Warna background</label>
                    <ColorField label="Warna background" value={form.introBg} onChange={(v) => set("introBg", v)} swatches={["#0D9488", "#7C3AED", "#DC2626", "#1E293B", "#0EA5E9"]} />
                  </div>
                  <div>
                    <Slider label="Durasi intro" value={form.introDuration} min={1} max={6} onChange={(v) => set("introDuration", v)} suffix="s" />
                    <p className="mt-0.5 text-[8px] text-muted-foreground">{form.hookVoice ? "Otomatis mengikuti durasi suara hook" : "Detik thumbnail tampil"}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                    <label className="text-[10px] font-medium text-muted-foreground">Gunakan frame video sebagai background</label>
                    <input
                      type="checkbox"
                      checked={form.introUseVideo}
                      onChange={(e) => set("introUseVideo", e.target.checked)}
                      className="size-3.5 accent-primary"
                    />
                  </div>
                  <div>
                    <ColorField label="Warna border card" value={form.introBorderColor} onChange={(v) => set("introBorderColor", v)} swatches={["#3B82F6", "#0D9488", "#DC2626", "#7C3AED", "#F59E0B"]} />
                    <p className="mt-0.5 text-[8px] text-muted-foreground">Card hook putih + border — di bagian bawah intro</p>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
        <Button variant="outline" className="h-9" onClick={onCancel}>Batal</Button>
        <Button onClick={onSave} className="h-9 gap-1.5" disabled={saving}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Palette className="size-3.5" />}
          {editing ? "Simpan Perubahan" : "Simpan Preset"}
        </Button>
      </div>
    </div>
  );
}

/** Pilih video — combobox searchable (pola shadcn Command + Popover). */
function VideoSelect({ videos, value, onChange, placeholder = "— pilih video —" }: { videos: Video[]; value: number | null; onChange: (id: number | null) => void; placeholder?: string }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const selected = videos.find((v) => v.id === value);
  const filtered = videos.filter(
    (v) =>
      !q.trim() ||
      v.title.toLowerCase().includes(q.trim().toLowerCase()) ||
      (v.channel ?? "").toLowerCase().includes(q.trim().toLowerCase())
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 min-w-0 w-full justify-between px-3 font-normal"
        >
          {selected ? (
            <span className="min-w-0 flex-1 truncate text-left text-xs" title={selected.title}>{selected.title}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari judul / channel…" value={q} onValueChange={setQ} className="h-9" />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-[10px] text-muted-foreground">Tidak ada video cocok.</CommandEmpty>
            <CommandGroup>
              {filtered.slice(0, 50).map((v) => (
                <CommandItem
                  key={v.id}
                  value={String(v.id)}
                  onSelect={() => {
                    onChange(v.id);
                    setOpen(false);
                    setQ("");
                  }}
                  className="cursor-pointer"
                >
                  <Check className={cn("mr-2 size-3.5 shrink-0", value === v.id ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs">{v.title}</span>
                    <span className="block truncate text-[9px] text-muted-foreground">{v.channel || "—"} · {fmtDur(v.durationSec)}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const TABS = [
  { id: "download", label: "Download", icon: Download, desc: "Unduh video YouTube" },
  { id: "library", label: "Library", icon: FolderOpen, desc: "Video & usage disk" },
  { id: "analyze", label: "Analisa", icon: Wand2, desc: "Transkrip & potongan viral" },
  { id: "editor", label: "Editor", icon: Film, desc: "Crop, preset & kualitas" },
  { id: "presets", label: "Presets", icon: Palette, desc: "Gaya clip tersimpan" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Video Clipper — unduh, transkrip, analisa viral, edit & clip. */
export function ClipperWorkspace() {
  const [tab, setTab] = React.useState<TabId>("download");
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [videos, setVideos] = React.useState<Video[]>([]);
  const [usage, setUsage] = React.useState(0);
  const [url, setUrl] = React.useState("");
  const [starting, setStarting] = React.useState(false);
  const [delTarget, setDelTarget] = React.useState<Video | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [player, setPlayer] = React.useState<{ src: string; title: string } | null>(null);
  const [delClip, setDelClip] = React.useState<Clip | null>(null);
  const [deletingClip, setDeletingClip] = React.useState(false);

  // Analisa
  const [selVideoId, setSelVideoId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<{ transcript: { text: string; segments: { start: number; end: number; text: string }[] } | null; analysis: { summary: string; candidates: Candidate[] } | null } | null>(null);
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = React.useState("");
  const [minLength, setMinLength] = React.useState(10);
  const [anaStep, setAnaStep] = React.useState(1);
  const [openTransIdx, setOpenTransIdx] = React.useState<number | null>(null);

  // Editor
  const [presets, setPresets] = React.useState<Preset[]>([]);
  const [clips, setClips] = React.useState<Clip[]>([]);
  const [editStart, setEditStart] = React.useState(0);
  const [editEnd, setEditEnd] = React.useState(30);
  const [presetId, setPresetId] = React.useState(0);
  const [quality, setQuality] = React.useState(720);
  const [selectedCandidate, setSelectedCandidate] = React.useState<Candidate | null>(null);

  // Presets
  const [presetForm, setPresetForm] = React.useState(EMPTY_PRESET);
  const [editPresetId, setEditPresetId] = React.useState<number | null>(null);
  const [presetOpen, setPresetOpen] = React.useState(false);

  // Library filter
  const [libFilter, setLibFilter] = React.useState("all");
  const [libSearch, setLibSearch] = React.useState("");

  // Jobs filter & manajemen
  const [jobFilter, setJobFilter] = React.useState("all");
  const [jobTypeFilter, setJobTypeFilter] = React.useState("all");
  const [jobLimit, setJobLimit] = React.useState(15);
  const [cleanJobsOpen, setCleanJobsOpen] = React.useState(false);
  const [cleaningJobs, setCleaningJobs] = React.useState(false);
  const [viralOpen, setViralOpen] = React.useState(true);
  const [clipsOpen, setClipsOpen] = React.useState(true);
  const [editorOpen, setEditorOpen] = React.useState(false);

  const loadAll = React.useCallback(async () => {
    try {
      const [j, v] = await Promise.all([
        fetch("/api/clipper/jobs").then((r) => r.json()),
        fetch("/api/clipper/videos").then((r) => r.json()),
      ]);
      setJobs(j.data ?? []);
      setVideos(v.data ?? []);
      setUsage(v.usage?.totalSize ?? 0);
    } catch {
      // biarkan
    }
  }, []);

  const loadPresets = React.useCallback(async () => {
    try {
      const j = await fetch("/api/clipper/presets").then((r) => r.json());
      setPresets(j.data ?? []);
    } catch {
      // biarkan
    }
  }, []);

  // Default preset otomatis dipilih di Editor saat pertama kali daftar preset dimuat
  const defaultApplied = React.useRef(false);
  React.useEffect(() => {
    if (defaultApplied.current) return;
    const def = presets.find((p) => p.isDefault);
    if (def) {
      const t = window.setTimeout(() => {
        setPresetId(def.id);
        defaultApplied.current = true;
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [presets]);

  const loadClips = React.useCallback(async () => {
    try {
      const j = await fetch("/api/clipper/clips").then((r) => r.json());
      setClips(j.data ?? []);
    } catch {
      // biarkan
    }
  }, []);

  React.useEffect(() => {
    const tick = () => {
      void loadAll();
      void loadClips();
    };
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, 2500);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [loadAll, loadClips]);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      void loadPresets();
      void loadClips();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadPresets, loadClips]);

  const loadDetail = React.useCallback(async (videoId: number) => {
    setBusyAction("load");
    try {
      const j = await fetch(`/api/clipper/videos/${videoId}`).then((r) => r.json());
      if (j.data) setDetail({ transcript: j.transcript, analysis: j.analysis });
    } catch {
      // biarkan
    } finally {
      setBusyAction(null);
    }
  }, []);

  React.useEffect(() => {
    if (selVideoId === null) return;
    const t = window.setTimeout(() => void loadDetail(selVideoId), 0);
    return () => window.clearTimeout(t);
  }, [selVideoId, loadDetail]);

  const runVideoAction = async (action: "transcribe" | "analyze") => {
    if (selVideoId === null) return;
    setBusyAction(action);
    try {
      const res = await fetch(`/api/clipper/videos/${selVideoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "analyze" ? { action, customPrompt, minLength } : { action }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal");
      toast.success(action === "transcribe" ? "Transkrip dimulai (model diunduh saat pertama)" : "Analisa viral dimulai");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusyAction(null);
    }
  };

  const startDownload = async () => {
    const u = url.trim();
    if (!u) return toast.error("Masukkan URL YouTube dulu");
    setStarting(true);
    try {
      const res = await fetch("/api/clipper/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "download", url: u }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal");
      toast.success("Download dimulai");
      setUrl("");
      void loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memulai download");
    } finally {
      setStarting(false);
    }
  };

  const cancelJob = async (id: number) => {
    await fetch(`/api/clipper/jobs/${id}`, { method: "POST" }).catch(() => {});
    void loadAll();
  };

  const removeVideo = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clipper/videos?id=${delTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`"${delTarget.title.slice(0, 40)}" dihapus`);
      setDelTarget(null);
      if (selVideoId === delTarget.id) setSelVideoId(null);
      void loadAll();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const removeClip = async () => {
    if (!delClip) return;
    setDeletingClip(true);
    try {
      const res = await fetch(`/api/clipper/clips/${delClip.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Clip dihapus");
      setDelClip(null);
      void loadClips();
    } catch {
      toast.error("Gagal menghapus clip");
    } finally {
      setDeletingClip(false);
    }
  };

  const startClip = async () => {
    if (selVideoId === null) return toast.error("Pilih video dulu");
    if (editEnd <= editStart) return toast.error("End harus lebih besar dari Start");
    setBusyAction("clip");
    try {
      const res = await fetch("/api/clipper/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: selVideoId,
          presetId,
          startSec: editStart,
          endSec: editEnd,
          quality,
          meta: selectedCandidate
            ? {
                title: selectedCandidate.hook_line.slice(0, 80),
                hookLine: selectedCandidate.hook_line,
                tags: `#${selectedCandidate.emotion.replace(/\s+/g, "")} #lifeos #viral`,
                score: selectedCandidate.score,
                emotion: selectedCandidate.emotion,
                reason: selectedCandidate.reason,
              }
            : {},
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal");
      toast.success("Clipping dimulai");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusyAction(null);
      void loadAll();
      void loadClips();
    }
  };

  const savePreset = async () => {
    if (!presetForm.name.trim()) return toast.error("Nama preset wajib diisi");
    try {
      const res = await fetch("/api/clipper/presets", {
        method: editPresetId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPresetId ? { ...presetForm, id: editPresetId } : presetForm),
      });
      const j = await res.json();
      if (!res.ok && !j.ok) throw new Error("Gagal simpan");
      toast.success(editPresetId ? "Preset diperbarui" : "Preset ditambahkan");
      setPresetOpen(false);
      setEditPresetId(null);
      setPresetForm(EMPTY_PRESET);
      void loadPresets();
    } catch {
      toast.error("Gagal menyimpan preset");
    }
  };
  const removePreset = async (id: number) => {
    await fetch(`/api/clipper/presets?id=${id}`, { method: "DELETE" }).catch(() => {});
    if (presetId === id) setPresetId(0);
    void loadPresets();
  };

  const setDefaultPreset = async (id: number) => {
    try {
      await fetch("/api/clipper/presets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isDefault: true }) });
      setPresetId(id);
      toast.success("Preset dijadikan default");
      void loadPresets();
    } catch {
      toast.error("Gagal set default");
    }
  };

  const cleanJobs = async () => {
    setCleaningJobs(true);
    try {
      const res = await fetch("/api/clipper/jobs", { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error();
      toast.success(`${j.deleted ?? 0} job riwayat dibersihkan`);
      setCleanJobsOpen(false);
      void loadAll();
    } catch {
      toast.error("Gagal membersihkan");
    } finally {
      setCleaningJobs(false);
    }
  };

  const activeVideo = videos.find((v) => v.id === selVideoId) ?? null;
  const hasTranscript = !!detail?.transcript;
  const filteredVideos = videos.filter(
    (v) =>
      (libFilter === "all" || v.status === libFilter) &&
      (!libSearch.trim() || v.title.toLowerCase().includes(libSearch.trim().toLowerCase()) || (v.channel ?? "").toLowerCase().includes(libSearch.trim().toLowerCase()))
  );
  const activeJobs = jobs.filter((j) => j.status === "running" || j.status === "queued");
  const doneJobs = jobs.filter((j) => j.status === "done");
  const failedJobs = jobs.filter((j) => j.status === "failed" || j.status === "cancelled");
  const filteredJobs = jobs.filter(
    (j) =>
      (jobFilter === "all" || (jobFilter === "running" ? j.status === "running" || j.status === "queued" : j.status === jobFilter)) &&
      (jobTypeFilter === "all" || j.type === jobTypeFilter)
  );
  const shownJobs = filteredJobs.slice(0, jobLimit);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Clapperboard className="size-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">Video Clipper</h1>
          <p className="text-sm text-muted-foreground">Unduh YouTube → transkrip → analisa viral → clip siap upload.</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => { void loadAll(); void loadClips(); }} title="Segarkan" aria-label="Segarkan">
          <RefreshCcw className="size-4" />
        </Button>
      </div>

      {/* Tabs (flex-wrap — mobile friendly, pola Stocks) */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.desc}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.id
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40"
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "download" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">URL YouTube</label>
            <div className="flex gap-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void startDownload()} placeholder="https://www.youtube.com/watch?v=…" className="h-9" />
              <Button onClick={() => void startDownload()} disabled={starting} className="h-9 shrink-0 gap-1.5">
                {starting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download
              </Button>
            </div>
            <p className="mt-2 text-[9px] text-muted-foreground">⚠️ Hanya unduh konten yang Anda punya izin (channel sendiri, Creative Commons).</p>
          </div>

          {/* Ringkasan + aksi */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 shadow-sm">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                <Loader2 className={cn("size-3", activeJobs.length > 0 && "animate-spin")} /> {activeJobs.length} aktif
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" /> {doneJobs.length} selesai
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-500">
                <XCircle className="size-3" /> {failedJobs.length} gagal
              </span>
              <span className="ml-auto text-[9px] text-muted-foreground">{jobs.length} total</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue placeholder="Semua tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua tipe</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                  <SelectItem value="transcribe">Transkrip</SelectItem>
                  <SelectItem value="analyze">Analisa</SelectItem>
                  <SelectItem value="clip">Clip</SelectItem>
                </SelectContent>
              </Select>
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="running">Aktif</SelectItem>
                  <SelectItem value="done">Selesai</SelectItem>
                  <SelectItem value="failed">Gagal</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 gap-1 text-[10px]" onClick={() => setCleanJobsOpen(true)} disabled={doneJobs.length + failedJobs.length === 0}>
                <Trash2 className="size-3" /> Bersihkan selesai
              </Button>
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <p className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">Belum ada job yang cocok.</p>
          ) : (
            <div className="space-y-2">
              {shownJobs.map((job) => (
                <div key={job.id} className="rounded-xl border bg-card p-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold", STATUS_STYLE[job.status] ?? "bg-muted")}>
                      {STATUS_LABEL[job.status] ?? job.status}
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold", TYPE_STYLE[job.type] ?? "bg-muted text-muted-foreground")}>
                      {job.type}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-xs">{job.message || "—"}</p>
                    <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{new Date(job.createdAt + "Z").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                    {(job.status === "running" || job.status === "queued") && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => void cancelJob(job.id)}>Batal</Button>
                    )}
                  </div>
                  {job.status === "running" && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${job.progress}%` }} />
                    </div>
                  )}
                  {job.url && <p className="mt-1 truncate text-[9px] text-muted-foreground">{job.url}</p>}
                </div>
              ))}
              {filteredJobs.length > jobLimit && (
                <Button variant="outline" size="sm" className="h-8 w-full text-[10px]" onClick={() => setJobLimit((l) => l + 15)}>
                  Muat lebih banyak ({filteredJobs.length - jobLimit} lagi)
                </Button>
              )}
            </div>
          )}
        </div>
      )}

        {/* ── Library ── */}
      {tab === "library" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted/60"><HardDrive className="size-4 text-primary" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Usage disk folder video</p>
                <p className="text-sm font-bold">{fmtBytes(usage)}</p>
                <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, usage / 1024 / 1024 / 1024 / 10)}%` }} />
                </div>
              </div>
              <div className="text-right text-[10px] text-muted-foreground">
                {videos.length} video
                <span className="block">{videos.filter((v) => v.exists).length} file</span>
                <span className="block">{videos.filter((v) => v.status !== "downloaded").length} sudah diproses</span>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={libSearch} onChange={(e) => setLibSearch(e.target.value)} placeholder="Cari judul / channel…" className="h-9 pl-8" />
            </div>
            <Select value={libFilter} onValueChange={setLibFilter}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="downloaded">Terunduh</SelectItem>
                <SelectItem value="transcribed">Transkrip ✓</SelectItem>
                <SelectItem value="analyzed">Analisa ✓</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground">Menampilkan {filteredVideos.length} dari {videos.length}</span>
          </div>

          {videos.length === 0 ? (
            <p className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">Belum ada video — unduh dulu di tab Download.</p>
          ) : filteredVideos.length === 0 ? (
            <p className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">Tidak ada video yang cocok dengan filter.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVideos.map((v) => (
                <div key={v.id} className={cn("group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md", selVideoId === v.id && "border-primary/50 ring-1 ring-primary/30")}>
                  {/* Thumbnail */}
                  <button className="relative block w-full text-left" onClick={() => { setSelVideoId(v.id); if (v.durationSec) setEditEnd(Math.min(30, v.durationSec)); }}>
                    <span className="relative block h-32 w-full overflow-hidden bg-muted/60">
                      {v.thumbnail ? (
                        <img src={v.thumbnail} alt={v.title} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
                      ) : (
                        <span className="flex size-full items-center justify-center"><Video className="size-7 text-muted-foreground/50" /></span>
                      )}
                      <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white">{fmtDur(v.durationSec)}</span>
                      {v.status !== "downloaded" && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[8px] font-bold text-white">
                          {VIDEO_STATUS_LABEL[v.status] ?? v.status}
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Info bawah */}
                  <div className="p-3">
                    <p className="truncate text-[13px] font-bold leading-snug" title={v.title}>{v.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="truncate">{v.channel || "Tanpa channel"}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {v.exists ? <CheckCircle2 className="size-3 text-emerald-500" /> : <XCircle className="size-3 text-rose-500" />}
                        {fmtBytes(v.sizeBytes)}
                      </span>
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 flex-1 gap-1 text-[10px]" onClick={() => setPlayer({ src: `/api/clipper/videos/${v.id}/file`, title: v.title })} disabled={!v.exists}>
                        <Play className="size-3" /> Putar
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 flex-1 text-[10px]" onClick={() => { setSelVideoId(v.id); void loadDetail(v.id); setTab("analyze"); setAnaStep(1); }}>
                        <Scissors className="size-3" /> Analisa
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 flex-1 text-[10px]" onClick={() => { setSelVideoId(v.id); setEditStart(0); setEditEnd(Math.min(60, v.durationSec || 30)); setTab("editor"); }}>
                        <Film className="size-3" /> Clip
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setDelTarget(v)} aria-label="Hapus video">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <p className="mt-1.5 text-[9px] text-muted-foreground">{new Date(v.createdAt + "Z").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

        {/* ── Analisa ── */}
      {tab === "analyze" && (
        <div className="space-y-4">
          {/* Stepper: 1. Transkrip → 2. Analisa */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
            <button
              onClick={() => setAnaStep(1)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                anaStep === 1 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40"
              )}
            >
              <span className={cn(
                "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                hasTranscript ? "bg-emerald-500 text-white" : anaStep === 1 ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {hasTranscript ? <Check className="size-3" /> : "1"}
              </span>
              Transkrip
              {hasTranscript && <span className="hidden text-[9px] font-normal text-emerald-600 sm:inline">· selesai</span>}
            </button>
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
            <button
              onClick={() => hasTranscript && setAnaStep(2)}
              disabled={!hasTranscript}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                anaStep === 2 ? "bg-primary/10 text-primary" : "text-muted-foreground",
                !hasTranscript && "cursor-not-allowed opacity-45"
              )}
            >
              <span className={cn(
                "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                detail?.analysis ? "bg-emerald-500 text-white" : anaStep === 2 ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {detail?.analysis ? <Check className="size-3" /> : "2"}
              </span>
              Analisa Viral
              {!hasTranscript && <span className="text-[9px] font-normal">· transkrip dulu</span>}
            </button>
          </div>

          {/* ── Step 1: Transkrip ── */}
          {anaStep === 1 && (
            <div className="space-y-3">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">1 · Pilih video & transkrip</label>
                <div className="flex gap-2">
                  <VideoSelect videos={videos} value={selVideoId} onChange={(id) => { setSelVideoId(id); setAnaStep(1); }} />
                  {!hasTranscript && (
                    <Button className="h-9 shrink-0 gap-1.5" onClick={() => void runVideoAction("transcribe")} disabled={selVideoId === null || busyAction !== null}>
                      {busyAction === "transcribe" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} Transkrip Sekarang
                    </Button>
                  )}
                </div>
                {!hasTranscript && (
                  <p className="mt-2 text-[9px] text-muted-foreground">Transkrip pertama kali mengunduh model Whisper (±5 menit). Progress tampil di tab Download.</p>
                )}
              </div>

              {busyAction === "load" && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Memuat…</p>}

              {selVideoId !== null && !hasTranscript && busyAction !== "load" && (
                <p className="rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">Belum ada transkrip untuk video ini — klik <b>Transkrip Sekarang</b>.</p>
              )}

              {detail?.transcript && (
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                    <Sparkles className="size-4 text-primary" /> Transkrip ({detail.transcript.segments.length} segmen)
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Siap</span>
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-lg bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground/90">
                    {detail.transcript.text || "—"}
                  </div>
                  <Button className="mt-3 h-9 w-full gap-1.5" onClick={() => setAnaStep(2)}>
                    Lanjut ke Analisa Viral <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Analisa ── */}
          {anaStep === 2 && (
            <div className="space-y-3">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">2 · Opsi analisa viral</label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto]">
                  <div>
                    <Label>Prompt kustom (opsional)</Label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Contoh: fokus potongan yang menyebutkan angka atau data, tone motivasi, cari momen kontroversial…"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    />
                  </div>
                  <div className="w-full sm:w-28">
                    <Label>Min. durasi clip (dtk)</Label>
                    <Input type="number" min={3} value={minLength || ""} onChange={(e) => setMinLength(Number(e.target.value))} className="h-9" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-[10px] text-muted-foreground" onClick={() => setAnaStep(1)}>
                    <ChevronLeft className="size-3.5" /> Kembali
                  </Button>
                  <Button className="h-9 shrink-0 gap-1.5" onClick={() => void runVideoAction("analyze")} disabled={selVideoId === null || busyAction !== null}>
                    {busyAction === "analyze" ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />} Analisa Viral Sekarang
                  </Button>
                </div>
              </div>

              {detail?.analysis && (
                <div className="space-y-3">
                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><Wand2 className="size-4 text-primary" /> Hasil Analisa Viral</p>
                    <p className="text-[11px] text-muted-foreground">{detail.analysis.summary}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {detail.analysis.candidates.map((c, i) => (
                      <div key={i} className="flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold tabular-nums" style={{ color: c.score >= 80 ? "#10B981" : c.score >= 60 ? "#F59E0B" : "#6B7280" }}>
                            {c.score}
                          </span>
                          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[9px] text-muted-foreground">{c.emotion}</span>
                          <span className="ml-auto rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">{fmtDur(c.start)}–{fmtDur(c.end)}</span>
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${c.score}%`, backgroundColor: c.score >= 80 ? "#10B981" : c.score >= 60 ? "#F59E0B" : "#6B7280" }} />
                        </div>
                        <p className="mt-2.5 text-sm font-semibold leading-snug">&quot;{c.hook_line}&quot;</p>
                        <p className="mt-1 flex-1 text-[10px] leading-relaxed text-muted-foreground">{c.reason}</p>
                        <button
                          type="button"
                          onClick={() => setOpenTransIdx(openTransIdx === i ? null : i)}
                          className="mt-2 flex h-7 w-full items-center justify-center gap-1 rounded-md border text-[10px] text-muted-foreground transition-colors hover:bg-muted/40"
                        >
                          <ChevronRight className={cn("size-3 transition-transform", openTransIdx === i && "rotate-90")} />
                          {openTransIdx === i ? "Sembunyikan transkrip" : "Lihat transkrip potongan ini"}
                        </button>
                        {openTransIdx === i && detail?.transcript && (
                          <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg bg-muted/40 p-2">
                            {detail.transcript.segments
                              .filter((s) => s.end >= c.start - 0.5 && s.start <= c.end + 0.5)
                              .map((s, si) => (
                                <p key={si} className="flex gap-1.5 text-[9px] leading-relaxed">
                                  <span className="shrink-0 font-mono text-primary/70">{fmtDur(s.start)}</span>
                                  <span className="text-foreground/85">{s.text}</span>
                                </p>
                              ))}
                            {detail.transcript.segments.filter((s) => s.end >= c.start - 0.5 && s.start <= c.end + 0.5).length === 0 && (
                              <p className="text-[9px] text-muted-foreground">Tidak ada segmen dalam rentang ini.</p>
                            )}
                          </div>
                        )}
                        <Button size="sm" className="mt-3 h-8 w-full gap-1 text-[10px]" onClick={() => { setEditStart(Math.floor(c.start)); setEditEnd(Math.ceil(c.end)); setSelectedCandidate(c); setTab("editor"); }}>
                          <Scissors className="size-3" /> Gunakan potongan ini
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!detail?.analysis && busyAction !== "load" && (
                <p className="rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">Klik <b>Analisa Viral Sekarang</b> untuk menemukan potongan yang berpotensi viral.</p>
              )}
            </div>
          )}
        </div>
      )}

        {/* ── Editor ── */}
      {tab === "editor" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card shadow-sm">
            <button type="button" onClick={() => setEditorOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
              <p className="flex items-center gap-1.5 text-sm font-semibold"><Film className="size-4 text-primary" /> Clip Editor</p>
              <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", editorOpen && "rotate-90")} />
            </button>
            {editorOpen && (
              <div className="border-t p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
              {/* Kiri: info video + range */}
              <div className="space-y-3">
                <div className="flex gap-3 rounded-xl border bg-muted/30 p-3">
                  <span className="relative block h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-muted/60">
                    {activeVideo?.thumbnail ? (
                      <img src={activeVideo.thumbnail} alt={activeVideo.title} className="size-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex size-full items-center justify-center"><Video className="size-6 text-muted-foreground/50" /></span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] font-bold leading-snug">{activeVideo?.title || "Pilih video…"}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{activeVideo?.channel || "—"} · {fmtDur(activeVideo?.durationSec ?? 0)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {activeVideo && (
                        <>
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[8px] font-bold", activeVideo.status === "analyzed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : activeVideo.status === "transcribed" ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "bg-muted text-muted-foreground")}>
                            {VIDEO_STATUS_LABEL[activeVideo.status] ?? activeVideo.status}
                          </span>
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] text-muted-foreground">{fmtBytes(activeVideo.sizeBytes)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Video</Label>
                  <VideoSelect videos={videos} value={selVideoId} onChange={(id) => { setSelVideoId(id); if (id) void loadDetail(id); }} />
                </div>

                {/* Range slider */}
                {activeVideo && (
                  <div className="space-y-2.5 rounded-xl border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rentang potongan</p>
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">{fmtDur(editStart)} – {fmtDur(editEnd)} · {Math.max(1, editEnd - editStart)}s</span>
                    </div>
                    <Slider label="Mulai" value={editStart} min={0} max={Math.max(1, (activeVideo.durationSec || 60) - 1)} onChange={(v) => { const s = Math.min(v, editEnd - 1); setEditStart(Math.max(0, s)); }} suffix="s" />
                    <Slider label="Selesai" value={editEnd} min={1} max={Math.max(2, activeVideo.durationSec || 60)} onChange={(v) => { const e = Math.max(v, editStart + 1); setEditEnd(Math.min(activeVideo.durationSec || 60, e)); }} suffix="s" />
                    <div className="flex gap-2 pt-1">
                      <Input type="number" min={0} value={editStart} onChange={(e) => setEditStart(Math.max(0, Math.min(Number(e.target.value) || 0, editEnd - 1)))} className="h-8" />
                      <span className="flex items-center text-[9px] text-muted-foreground">sampai</span>
                      <Input type="number" min={1} value={editEnd} onChange={(e) => setEditEnd(Math.max(editStart + 1, Math.min(Number(e.target.value) || 1, activeVideo.durationSec || 60)))} className="h-8" />
                    </div>
                  </div>
                )}
              </div>

              {/* Kanan: preset + kualitas + aksi */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Preset style</Label>
                    <Select value={String(presetId)} onValueChange={(v) => setPresetId(Number(v))}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Pilih preset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Default (9:16)</SelectItem>
                        {presets.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}{p.isDefault ? " ⭐" : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Kualitas</Label>
                    <Select value={String(quality)} onValueChange={(v) => setQuality(Number(v))}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Pilih kualitas" />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALITIES.map((q) => <SelectItem key={q} value={String(q)}>{q}p</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(() => {
                  const p = presets.find((x) => x.id === presetId);
                  return (
                    <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                      {p ? (
                        <PhoneCanvas size="sm" form={presetToForm(p)} />
                      ) : (
                        <PhoneCanvas size="sm" form={{ ...EMPTY_PRESET, name: "", ctaText: "" }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold">{p ? p.name : "Default (9:16)"}{p?.isDefault ? " ⭐" : ""}</p>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] text-muted-foreground">{p?.ratio ?? "9:16"}</span>
                          {p?.ctaText && <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-600 dark:text-amber-400">CTA</span>}
                          {!!p?.showSource && <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-bold text-blue-600 dark:text-blue-400">Sumber</span>}
                          {p?.captionMode !== "off" && <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-bold text-violet-600 dark:text-violet-400">Teks</span>}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button onClick={() => void startClip()} disabled={selVideoId === null || busyAction !== null} className="h-9 gap-1.5">
                    {busyAction === "clip" ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />} Proses Clip
                  </Button>
                  <Button variant="outline" className="h-9 gap-1.5" onClick={() => activeVideo && setPlayer({ src: `/api/clipper/videos/${activeVideo.id}/file`, title: activeVideo.title })} disabled={!activeVideo?.exists}>
                    <Play className="size-3.5" /> Lihat Video
                  </Button>
                </div>

                {selectedCandidate && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[10px] text-foreground/90">
                    <span className="font-semibold text-primary">Hook terpilih:</span> &quot;{selectedCandidate.hook_line}&quot;{" "}
                    <button className="ml-1 font-medium text-primary underline underline-offset-2" onClick={() => setSelectedCandidate(null)}>batal</button>
                  </div>
                )}

                {/* Progress clip lokal */}
                {(() => {
                  const running = jobs.filter((j) => j.type === "clip" && j.videoId === selVideoId && (j.status === "running" || j.status === "queued"));
                  if (running.length === 0) return null;
                  const j = running[0];
                  return (
                    <div className="rounded-xl border bg-card p-3.5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="size-3.5 animate-spin text-primary" />
                        <span className="text-[10px] font-bold">{j.status === "queued" ? "Dalam antrean…" : "Sedang memproses clip…"}</span>
                        <span className="ml-auto font-mono text-[10px] tabular-nums">{j.progress}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${j.progress}%` }} />
                      </div>
                      <p className="mt-1 text-[9px] text-muted-foreground">{j.message || "Menjalankan ffmpeg…"}</p>
                    </div>
                  );
                })()}
              </div>
            </div>
              </div>
            )}
          </div>

          {/* Hasil analisa video terpilih */}
          {activeVideo && (
            <div className="rounded-xl border bg-card shadow-sm">
              <button type="button" onClick={() => setViralOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Wand2 className="size-4 text-primary" /> Potongan Viral Terbaik
                  {detail?.analysis && (
                    <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{detail.analysis.candidates.length} potongan</span>
                  )}
                </p>
                <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", viralOpen && "rotate-90")} />
              </button>
              {viralOpen && (
                <div className="border-t p-4">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] text-muted-foreground">{activeVideo.title}</p>
                    {!detail?.analysis && (
                      <Button variant="outline" size="sm" className="h-7 shrink-0 gap-1 text-[10px]" onClick={() => setTab("analyze")}>
                        <Wand2 className="size-3" /> Analisa dulu
                      </Button>
                    )}
                  </div>
                  {detail?.analysis && detail.analysis.candidates.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {detail.analysis.candidates.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { setEditStart(Math.floor(c.start)); setEditEnd(Math.ceil(c.end)); setSelectedCandidate(c); }}
                          className={cn(
                            "group flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5",
                            selectedCandidate === c && "border-primary/50 bg-primary/5"
                          )}
                        >
                          <span className="w-8 shrink-0 font-mono text-base font-bold tabular-nums" style={{ color: c.score >= 80 ? "#10B981" : c.score >= 60 ? "#F59E0B" : "#6B7280" }}>
                            {c.score}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-semibold">&quot;{c.hook_line}&quot;</span>
                            <span className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground">
                              <span className="font-mono">{fmtDur(c.start)}–{fmtDur(c.end)}</span>
                              <span>·</span>
                              <span>{c.emotion}</span>
                            </span>
                          </span>
                          <Scissors className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed py-5 text-center text-[10px] text-muted-foreground">
                      {activeVideo.status === "analyzed" ? "Belum ada analisa untuk video ini." : "Video belum dianalisa — jalankan Analisa Viral dulu untuk melihat potongan terbaik."}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hasil clip */}
          <div className="rounded-xl border bg-card shadow-sm">
            <button type="button" onClick={() => setClipsOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Film className="size-4 text-primary" /> Hasil Clip
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">{clips.length}</span>
              </p>
              <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", clipsOpen && "rotate-90")} />
            </button>
            {clipsOpen && (
              <div className="border-t p-4">
            {clips.length === 0 ? (
              <p className="rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">Belum ada clip — proses di atas.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clips.map((c) => {
                  const parent = videos.find((v) => v.id === c.videoId);
                  const presetUsed = presets.find((p) => p.id === c.presetId);
                  const caption = [c.hookLine && `"${c.hookLine}"`, c.tags].filter(Boolean).join("\n\n");
                  return (
                    <div key={c.id} className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
                      <button className="relative block w-full text-left" onClick={() => setPlayer({ src: `/api/clipper/clips/${c.id}/file`, title: c.title || parent?.title || `Clip #${c.id}` })}>
                        <span className="relative block h-32 w-full overflow-hidden bg-muted/60">
                          {parent?.thumbnail ? (
                            <img src={parent.thumbnail} alt={c.title || parent.title} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
                          ) : (
                            <span className="flex size-full items-center justify-center"><Film className="size-7 text-muted-foreground/50" /></span>
                          )}
                          <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white">{fmtDur(c.startSec)}–{fmtDur(c.endSec)}</span>
                          {typeof c.score === "number" && c.score > 0 && (
                            <span className="absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: c.score >= 80 ? "rgba(16,185,129,.9)" : c.score >= 60 ? "rgba(245,158,11,.9)" : "rgba(107,114,128,.9)", color: "#fff" }}>
                              ⚡ {c.score}
                            </span>
                          )}
                        </span>
                      </button>
                      <div className="p-3">
                        <p className="truncate text-[13px] font-bold leading-snug" title={c.title || parent?.title}>
                          {c.title || parent?.title || `Clip #${c.id}`}
                        </p>
                        {c.hookLine && <p className="mt-0.5 truncate text-[10px] italic text-muted-foreground" title={c.hookLine}>&quot;{c.hookLine}&quot;</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {presetUsed && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold text-primary">🎨 {presetUsed.name}</span>}
                          {c.emotion && <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[8px] text-muted-foreground">{c.emotion}</span>}
                          <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[8px] text-muted-foreground">{c.quality}p</span>
                          <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[8px] text-muted-foreground">{fmtBytes(c.sizeBytes)}</span>
                        </div>
                        <div className="mt-2 flex gap-1.5">
                          {caption && (
                            <Button variant="outline" size="sm" className="h-7 flex-1 gap-1 text-[10px]" onClick={() => { navigator.clipboard.writeText(caption).then(() => toast.success("Caption disalin — siap posting!")).catch(() => toast.error("Gagal menyalin")); }}>
                              <Copy className="size-3" /> Salin
                            </Button>
                          )}
                          <a href={`/api/clipper/clips/${c.id}/file`} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md bg-primary text-[10px] font-medium text-primary-foreground hover:opacity-90">
                            <Download className="size-3" /> Unduh
                          </a>
                          <Button variant="ghost" size="icon" className="size-7 shrink-0 text-destructive" onClick={() => setDelClip(c)} aria-label="Hapus clip">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
              </div>
            )}
          </div>
        </div>
      )}

        {/* ── Presets ── */}
      {tab === "presets" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card shadow-sm">
            <button onClick={() => { setPresetOpen((o) => !o); setEditPresetId(null); setPresetForm(EMPTY_PRESET); }} className="flex w-full items-center justify-between px-4 py-3 text-left">
              <span className="flex items-center gap-2 text-sm font-semibold"><Palette className="size-4 text-primary" /> {editPresetId ? "Edit Preset" : "Tambah Preset"}</span>
              <span className="text-[10px] text-muted-foreground">{presetOpen ? "Sembunyikan" : "Tampilkan"}</span>
            </button>
            {presetOpen && (
              <PresetBuilder
                form={presetForm}
                setForm={setPresetForm}
                onSave={() => void savePreset()}
                onCancel={() => { setPresetOpen(false); setEditPresetId(null); setPresetForm(EMPTY_PRESET); }}
                saving={busyAction === "preset"}
                editing={editPresetId !== null}
              />
            )}
          </div>

          {presets.length === 0 ? (
            <p className="rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">Belum ada preset — buat gaya clip-mu sendiri.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {presets.map((p) => (
                <div key={p.id} className="group rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <PhoneCanvas size="md" form={presetToForm(p)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{p.name}{p.isDefault ? " ⭐" : ""}</p>
                      <div className="mt-1 flex flex-wrap gap-1 text-[9px] text-muted-foreground">
                        <span className="rounded-full bg-muted/60 px-1.5 py-0.5">{p.ratio}</span>
                        <span className="rounded-full bg-muted/60 px-1.5 py-0.5">teks {p.captionPosition}</span>
                        <span className="rounded-full bg-muted/60 px-1.5 py-0.5">{p.captionSize}px {p.captionColor}</span>
                      </div>
                      {p.ctaText && <p className="mt-1 truncate text-[9px] text-amber-500">CTA: {p.ctaText}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => void removePreset(p.id)} aria-label="Hapus preset"><Trash2 className="size-3" /></Button>
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    <Button size="sm" className="h-7 flex-1 gap-1 text-[10px]" onClick={() => { setPresetId(p.id); setTab("editor"); }}>
                      <Scissors className="size-3" /> Gunakan di Editor
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 flex-1 text-[10px]" onClick={() => { setEditPresetId(p.id); setPresetForm(presetToForm(p)); setPresetOpen(true); }}>
                      Edit
                    </Button>
                    {!p.isDefault && (
                      <Button variant="ghost" size="sm" className="h-7 flex-1 gap-1 text-[10px]" title="Jadikan preset bawaan di Editor" onClick={() => void setDefaultPreset(p.id)}>
                        <Star className="size-3" /> Default
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Player inline (video & clip) */}
      <Dialog open={player !== null} onOpenChange={(o) => !o && setPlayer(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6 text-sm">{player?.title}</DialogTitle>
          </DialogHeader>
          {player && (
            <video key={player.src} src={player.src} controls autoPlay playsInline className="max-h-[70vh] w-full rounded-lg bg-black" />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cleanJobsOpen}
        onOpenChange={(o) => !o && setCleanJobsOpen(false)}
        title="Bersihkan riwayat job?"
        description={`Hapus ${doneJobs.length + failedJobs.length} job selesai/gagal dari riwayat. Job yang sedang berjalan tidak terpengaruh.`}
        confirmLabel="Bersihkan"
        destructive
        busy={cleaningJobs}
        onConfirm={() => void cleanJobs()}
      />

      <ConfirmDialog
        open={delClip !== null}
        onOpenChange={(o) => !o && setDelClip(null)}
        title="Hapus clip?"
        description={`"${delClip?.title || "Clip"}" (${fmtBytes(delClip?.sizeBytes ?? 0)}) akan dihapus dari disk.`}
        confirmLabel="Hapus"
        destructive
        busy={deletingClip}
        onConfirm={() => void removeClip()}
      />

      <ConfirmDialog
        open={delTarget !== null}
        onOpenChange={(o) => !o && setDelTarget(null)}
        title="Hapus video?"
        description={`"${delTarget?.title.slice(0, 50)}" (${fmtBytes(delTarget?.sizeBytes ?? 0)}) akan dihapus dari disk.`}
        confirmLabel="Hapus"
        destructive
        busy={deleting}
        onConfirm={() => void removeVideo()}
      />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{children}</label>;
}
