"use client";

import * as React from "react";
import JSZip from "jszip";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ImageIcon,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CAROUSEL_RATIOS,
  downloadCanvas,
  renderSlide,
  type Branding,
  type CarouselSize,
  type SlideData,
} from "@/lib/carousel-renderer";

export interface CarouselItem {
  id: number;
  topic: string;
  slideCount: number;
  theme: string;
  bgSource: "gambar" | "ai" | "gradient";
  content: string;
  createdAt: string;
}

export interface CarouselContent {
  judul: string;
  slides: SlideData[];
  caption: string;
  hashtags: string[];
  bgSpec: { style: string; palet: string[]; arahGradient?: string; bentuk?: string };
}

export function parseCarousel(raw: string): CarouselContent | null {
  try {
    return JSON.parse(raw) as CarouselContent;
  } catch {
    return null;
  }
}

/** Modal preview carousel — navigasi slide, edit teks, pilih ukuran, download ZIP/per slide. */
export function CarouselPreview({
  item,
  branding,
  open,
  onOpenChange,
  onSaved,
}: {
  item: CarouselItem | null;
  branding: Branding | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = React.useState<CarouselSize>("square");
  const [idx, setIdx] = React.useState(0);
  // State diinisialisasi dari props (komponen di-remount via key di parent)
  const [slides, setSlides] = React.useState<SlideData[]>(() =>
    item ? (parseCarousel(item.content)?.slides ?? []) : []
  );
  const [rendering, setRendering] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [zipping, setZipping] = React.useState(false);

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
        branding: branding ?? {
          brandName: "LifeOS",
          handle: "@lifeos",
          tagline: "",
          initials: "L",
          showBranding: true,
        },
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
    if (open && slides.length > 0) {
      const t = setTimeout(() => void draw(), 60);
      return () => clearTimeout(t);
    }
  }, [open, slides, idx, size, branding, draw]);

  const downloadOne = () => {
    if (!canvasRef.current) return;
    downloadCanvas(
      canvasRef.current,
      `carousel-${(item!.topic || "slide").replace(/[^a-z0-9]/gi, "-").toLowerCase()}-slide-${idx + 1}-${size}.png`
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
      const base = (item.topic || "carousel").replace(/[^a-z0-9]/gi, "-").toLowerCase();
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

  const updateSlide = (field: "heading" | "points", value: string, pointIdx?: number) => {
    setSlides((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        if (field === "heading") return { ...s, heading: value };
        const points = [...s.points];
        if (pointIdx !== undefined) points[pointIdx] = value;
        return { ...s, points };
      })
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
      onSaved();
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const current = slides[idx];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="size-4 text-primary" /> Carousel — {item?.topic}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          {/* Preview canvas */}
          <div>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={idx === 0}
                  onClick={() => setIdx((i) => Math.max(0, i - 1))}
                >
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
            <div className="relative mt-2 flex justify-center">
              {rendering && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Merender slide…
                </div>
              )}
              <canvas
                ref={canvasRef}
                className="max-h-[55vh] w-auto max-w-full rounded-lg border border-border/60 shadow-sm"
              />
            </div>
          </div>

          {/* Edit slide */}
          <div className="space-y-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <Sparkles className="size-3.5 text-primary" /> Edit slide {idx + 1}
            </p>
            {current && (
              <>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Judul
                  </label>
                  <Input value={current.heading} onChange={(e) => updateSlide("heading", e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Poin
                  </label>
                  <div className="space-y-1.5">
                    {current.points.map((p, i) => (
                      <Input
                        key={i}
                        value={p}
                        onChange={(e) => updateSlide("points", e.target.value, i)}
                        className="h-8 text-xs"
                      />
                    ))}
                    {current.points.length < 4 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-full text-[11px]"
                        onClick={() => setSlides((prev) => prev.map((s, j) => (j === idx ? { ...s, points: [...s.points, ""] } : s)))}
                      >
                        + Tambah poin
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
            <Button onClick={() => void saveEdits()} disabled={saving} className="h-8 w-full gap-1.5 text-xs">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Simpan perubahan
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button variant="secondary" onClick={downloadOne} disabled={!current} className="gap-1.5">
            <Download className="size-4" /> Slide ini
          </Button>
          <Button onClick={() => void downloadZip()} disabled={zipping || slides.length === 0} className="gap-1.5">
            {zipping ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Download ZIP ({slides.length} slide)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
