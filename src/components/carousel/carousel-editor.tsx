"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CAROUSEL_RATIOS,
  downloadCanvas,
  renderSlide,
  type Branding,
  type CarouselSize,
  type SlideData,
} from "@/lib/carousel-renderer";

interface CarouselDetail {
  id: number;
  topic: string;
  slideCount: number;
  theme: string;
  bgSource: "gambar" | "ai" | "gradient";
  content: string;
  createdAt: string;
}

interface CarouselContent {
  judul: string;
  slides: SlideData[];
  caption: string;
  hashtags: string[];
  bgSpec: { style: string; palet: string[]; arahGradient?: string; bentuk?: string };
}

function parseCarousel(raw: string): CarouselContent | null {
  try {
    return JSON.parse(raw) as CarouselContent;
  } catch {
    return null;
  }
}

/** Halaman editor carousel — preview besar, edit tiap slide, pilih ukuran, download ZIP. */
export function CarouselEditor({ id }: { id: number }) {
  const router = useRouter();
  const [item, setItem] = React.useState<CarouselDetail | null>(null);
  const [branding, setBranding] = React.useState<Branding | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [size, setSize] = React.useState<CarouselSize>("square");
  const [idx, setIdx] = React.useState(0);
  const [slides, setSlides] = React.useState<SlideData[]>([]);
  const [rendering, setRendering] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [zipping, setZipping] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Settings branding dialog
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [sBrandName, setSBrandName] = React.useState("LifeOS");
  const [sHandle, setSHandle] = React.useState("@lifeos");
  const [sTagline, setSTagline] = React.useState("");
  const [sInitials, setSInitials] = React.useState("L");
  const [sShowBranding, setSShowBranding] = React.useState(true);
  const [sSaving, setSSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/carousels/${id}`).then((r) => r.json()),
      fetch("/api/carousel-settings").then((r) => r.json()),
    ])
      .then(([c, s]) => {
        if (cancelled) return;
        if (!c.data) {
          toast.error("Carousel tidak ditemukan");
          router.push("/carousel");
          return;
        }
        setItem(c.data);
        setSlides(parseCarousel(c.data.content)?.slides ?? []);
        if (s.data) setBranding(s.data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat carousel");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const draw = React.useCallback(async () => {
    if (!item || slides.length === 0) return;
    setRendering(true);
    try {
      const data = parseCarousel(item.content);
      const spec = {
        style: (data?.bgSpec?.style ?? "mesh") as "mesh" | "wave" | "geometric" | "glow" | "minimal",
        palet: data?.bgSpec?.palet?.length === 3 ? data.bgSpec.palet : ["#0D9488", "#134E4A", "#5EEAD4"],
        arahGradient: data?.bgSpec?.arahGradient,
        bentuk: data?.bgSpec?.bentuk,
      };
      const canvas = await renderSlide({
        slide: slides[idx],
        index: idx,
        total: slides.length,
        topic: item.topic,
        spec,
        bgSource: item.bgSource,
        branding: branding ?? { brandName: "LifeOS", handle: "@lifeos", tagline: "", initials: "L", showBranding: true },
        size,
        seed: item.id,
      });
      if (canvasRef.current) {
        canvasRef.current.width = canvas.width;
        canvasRef.current.height = canvas.height;
        canvasRef.current.getContext("2d")!.drawImage(canvas, 0, 0);
      }
    } catch {
      toast.error("Gagal render slide");
    } finally {
      setRendering(false);
    }
  }, [item, slides, idx, size, branding]);

  React.useEffect(() => {
    if (slides.length > 0) {
      const t = setTimeout(() => void draw(), 60);
      return () => clearTimeout(t);
    }
  }, [slides, idx, size, branding, draw]);

  const updateSlide = (field: "heading" | "emoji", value: string) => {
    setSlides((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const updatePoint = (pointIdx: number, value: string) => {
    setSlides((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        const points = [...s.points];
        points[pointIdx] = value;
        return { ...s, points };
      })
    );
  };

  const addPoint = () => {
    setSlides((prev) => prev.map((s, i) => (i === idx && s.points.length < 4 ? { ...s, points: [...s.points, ""] } : s)));
  };

  const removePoint = (pointIdx: number) => {
    setSlides((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, points: s.points.filter((_, j) => j !== pointIdx) } : s))
    );
  };

  const saveEdits = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const data = parseCarousel(item.content)!;
      const updated = { ...data, slides };
      const res = await fetch(`/api/carousels/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify(updated) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Perubahan disimpan 💾");
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const downloadOne = () => {
    if (!canvasRef.current || !item) return;
    downloadCanvas(
      canvasRef.current,
      `carousel-${item.topic.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-slide-${idx + 1}-${size}.png`
    );
    toast.success(`Slide ${idx + 1} diunduh 🖼️`);
  };

  const downloadZip = async () => {
    if (!item || slides.length === 0) return;
    setZipping(true);
    try {
      const data = parseCarousel(item.content);
      const spec = {
        style: (data?.bgSpec?.style ?? "mesh") as "mesh" | "wave" | "geometric" | "glow" | "minimal",
        palet: data?.bgSpec?.palet?.length === 3 ? data.bgSpec.palet : ["#0D9488", "#134E4A", "#5EEAD4"],
        arahGradient: data?.bgSpec?.arahGradient,
        bentuk: data?.bgSpec?.bentuk,
      };
      const b = branding ?? { brandName: "LifeOS", handle: "@lifeos", tagline: "", initials: "L", showBranding: true };
      const zip = new JSZip();
      const base = item.topic.replace(/[^a-z0-9]/gi, "-").toLowerCase();
      for (let i = 0; i < slides.length; i++) {
        const canvas = await renderSlide({
          slide: slides[i],
          index: i,
          total: slides.length,
          topic: item.topic,
          spec,
          bgSource: item.bgSource,
          branding: b,
          size,
          seed: item.id,
        });
        zip.file(`${base}-slide-${i + 1}-${size}.png`, canvas.toDataURL("image/png").split(",")[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${base}-${size}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`${slides.length} slide diunduh sebagai ZIP 📦`);
    } catch {
      toast.error("Gagal membuat ZIP");
    } finally {
      setZipping(false);
    }
  };

  const openSettings = () => {
    if (branding) {
      setSBrandName(branding.brandName);
      setSHandle(branding.handle);
      setSTagline(branding.tagline);
      setSInitials(branding.initials);
      setSShowBranding(branding.showBranding);
    }
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    setSSaving(true);
    try {
      const res = await fetch("/api/carousel-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: sBrandName,
          handle: sHandle,
          tagline: sTagline,
          initials: sInitials,
          showBranding: sShowBranding,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error();
      setBranding(json.data);
      toast.success("Branding disimpan 💼");
      setSettingsOpen(false);
    } catch {
      toast.error("Gagal menyimpan branding");
    } finally {
      setSSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Memuat carousel…
      </div>
    );
  }

  if (!item) return null;

  const data = parseCarousel(item.content);
  const current = slides[idx];

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => router.push("/carousel")} aria-label="Kembali">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ImageIcon className="size-5 text-primary" /> {data?.judul ?? item.topic}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            🎯 {item.topic} · {item.slideCount} slide · {CAROUSEL_RATIOS[size].label}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={openSettings}>
          <Settings2 className="size-3.5" /> Branding
        </Button>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => void downloadZip()} disabled={zipping}>
          {zipping ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          Download ZIP
        </Button>
      </header>

      <div className="space-y-4">
        {/* ── Preview slide (full width) ── */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as CarouselSize)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              {(Object.keys(CAROUSEL_RATIOS) as CarouselSize[]).map((s) => (
                <option key={s} value={s}>
                  {CAROUSEL_RATIOS[s].label}
                </option>
              ))}
            </select>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-7" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {idx + 1} / {slides.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={idx >= slides.length - 1}
                onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Indikator dots */}
          <div className="flex gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={cn("h-1.5 rounded-full transition-all", i === idx ? "w-6 bg-primary" : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/40")}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="relative flex justify-center rounded-xl border border-border/60 bg-muted/20 p-3">
            {rendering && (
              <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-muted/40 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Merender slide…
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="max-h-[62vh] w-auto max-w-full rounded-lg shadow-sm"
            />
          </div>
        </div>

        {/* ── Form edit slide (di bawah preview) ── */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/50 bg-muted/20 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" /> Edit slide {idx + 1}
            </p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Slide {idx + 1} dari {slides.length}
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              Perubahan tampil langsung di preview ⚡
            </span>
          </div>

          {current && (
            <div className="space-y-4 p-4">
              {/* Emoji + Judul */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[110px_1fr]">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Emoji
                  </label>
                  <Input
                    value={current.emoji ?? ""}
                    onChange={(e) => updateSlide("emoji", e.target.value)}
                    placeholder="💡"
                    className="h-10 text-center text-base"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Judul slide
                  </label>
                  <Input
                    value={current.heading}
                    onChange={(e) => updateSlide("heading", e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Points — Textarea */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Konten / poin ({current.points.length}/4)
                  </label>
                  {current.points.length < 4 && (
                    <Button variant="outline" size="sm" className="h-6 gap-1 text-[11px]" onClick={addPoint}>
                      <Plus className="size-3" /> Tambah poin
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {current.points.map((p, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-2 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <Textarea
                        value={p}
                        onChange={(e) => updatePoint(i, e.target.value)}
                        placeholder={`Tulis konten poin ${i + 1}…`}
                        rows={3}
                        className="min-h-[72px] flex-1 resize-y text-sm leading-relaxed"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-1 size-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removePoint(i)}
                        aria-label="Hapus poin"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Caption & hashtag preview */}
              {data && (
                <div className="grid grid-cols-1 gap-2 rounded-lg border border-border/50 bg-muted/20 p-3 sm:grid-cols-2">
                  <div>
                    <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <ImageIcon className="size-3" /> Caption
                    </p>
                    <p className="mt-0.5 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">{data.caption}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Hashtag</p>
                    <p className="mt-0.5 line-clamp-3 text-[11px] leading-relaxed text-primary/70">{data.hashtags.join(" ")}</p>
                  </div>
                </div>
              )}

              {/* Aksi */}
              <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                <Button variant="secondary" size="sm" className="h-9 gap-1.5 text-xs" onClick={downloadOne} disabled={!current}>
                  <Download className="size-3.5" /> Download slide {idx + 1}
                </Button>
                <Button
                  size="sm"
                  className="ml-auto h-9 gap-1.5 text-xs"
                  onClick={() => void saveEdits()}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  Simpan perubahan
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Settings branding ── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-4 text-primary" /> Branding carousel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Nama brand / akun
              </label>
              <Input value={sBrandName} onChange={(e) => setSBrandName(e.target.value)} placeholder="LifeOS Tips" className="h-9 text-sm" />
              <p className="mt-1 text-[9px] text-muted-foreground">Kosongkan nama → tanpa logo/avatar di header slide.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Handle Instagram</label>
                <Input value={sHandle} onChange={(e) => setSHandle(e.target.value)} placeholder="@lifeos.tips" className="h-9 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Inisial logo</label>
                <Input value={sInitials} onChange={(e) => setSInitials(e.target.value)} placeholder="LT" className="h-9 text-sm" maxLength={3} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tagline</label>
              <Input value={sTagline} onChange={(e) => setSTagline(e.target.value)} placeholder="Tips hemat & produktif tiap hari" className="h-9 text-sm" />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input type="checkbox" checked={sShowBranding} onChange={(e) => setSShowBranding(e.target.checked)} className="size-3.5 accent-primary" />
              Tampilkan branding di header & footer slide
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Batal</Button>
            <Button onClick={() => void saveSettings()} disabled={sSaving} className="gap-1.5">
              {sSaving && <Loader2 className="size-4 animate-spin" />}
              Simpan branding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
