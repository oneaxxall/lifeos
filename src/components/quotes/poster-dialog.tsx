"use client";

import * as React from "react";
import { Download, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { QuoteItem } from "@/components/quotes/quotes-workspace";

type Ratio = "landscape" | "square" | "status";

/** Konfigurasi ukuran poster — friendly Instagram & WhatsApp Status. */
const RATIOS: Record<
  Ratio,
  { label: string; sub: string; w: number; h: number; badgeY: number; quoteY: number; fontSize: number; maxLines: number; padX: number }
> = {
  landscape: { label: "Landscape", sub: "Web", w: 1200, h: 630, badgeY: 72, quoteY: 150, fontSize: 46, maxLines: 5, padX: 84 },
  square: { label: "Persegi", sub: "IG Post", w: 1080, h: 1080, badgeY: 96, quoteY: 280, fontSize: 56, maxLines: 7, padX: 96 },
  status: { label: "Status", sub: "WA / IG Story", w: 1080, h: 1920, badgeY: 130, quoteY: 760, fontSize: 62, maxLines: 9, padX: 108 },
};

/** Wrap teks manual untuk canvas — pecah per kata, hormati maxWidth. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Render poster quote — gambar background (Picsum) + quote serif + author + footer. */
export function PosterDialog({
  quote,
  open,
  onOpenChange,
}: {
  quote: QuoteItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [ratio, setRatio] = React.useState<Ratio>("square");
  const [loading, setLoading] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  const drawPoster = React.useCallback(async () => {
    if (!quote || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cfg = RATIOS[ratio];
    canvas.width = cfg.w;
    canvas.height = cfg.h;

    setLoading(true);
    setReady(false);
    try {
      // 1. Background — Picsum (gratis, tanpa key; seed = topik quote)
      const seed = (quote.topic || "motivasi").replace(/[^a-z0-9]/gi, "").toLowerCase() || "motivasi";
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = `https://picsum.photos/seed/${seed}/${cfg.w}/${cfg.h}`;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("gagal memuat gambar"));
      });

      // 2. Cover crop
      ctx.clearRect(0, 0, cfg.w, cfg.h);
      const scale = Math.max(cfg.w / img.width, cfg.h / img.height);
      const sw = cfg.w / scale;
      const sh = cfg.h / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cfg.w, cfg.h);

      // 3. Overlay gradient gelap (teks terbaca) — lebih kuat di rasio tinggi
      const grad = ctx.createLinearGradient(0, 0, 0, cfg.h);
      grad.addColorStop(0, "rgba(10, 12, 12, 0.5)");
      grad.addColorStop(0.5, "rgba(10, 12, 12, 0.72)");
      grad.addColorStop(1, "rgba(10, 12, 12, 0.9)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cfg.w, cfg.h);

      // 4. Teks quote — font serif (Literata → fallback Georgia)
      ctx.textBaseline = "top";
      const font = '"Literata", Georgia, "Times New Roman", serif';
      const padX = cfg.padX;
      const maxWidth = cfg.w - padX * 2;

      // Badge atas
      ctx.font = `600 20px ${font}`;
      ctx.fillStyle = "rgba(250, 250, 249, 0.85)";
      ctx.fillText("✦ QUOTE OF THE DAY", padX, cfg.badgeY);

      // Quote utama — ukuran adaptif
      let fontSize = cfg.fontSize;
      ctx.font = `italic 500 ${fontSize}px ${font}`;
      let lines = wrapText(ctx, quote.content, maxWidth);
      while (lines.length > cfg.maxLines && fontSize > 28) {
        fontSize -= 2;
        ctx.font = `italic 500 ${fontSize}px ${font}`;
        lines = wrapText(ctx, quote.content, maxWidth);
      }

      // Tanda kutip pembuka besar
      ctx.font = `italic 500 ${fontSize * 1.6}px ${font}`;
      ctx.fillStyle = "rgba(13, 148, 136, 0.9)";
      ctx.fillText("“", padX, cfg.quoteY - fontSize * 0.9);

      const lineHeight = fontSize * 1.4;
      let y = cfg.quoteY;
      ctx.fillStyle = "#FAFAF9";
      ctx.font = `italic 500 ${fontSize}px ${font}`;
      for (const line of lines) {
        ctx.fillText(line, padX, y);
        y += lineHeight;
      }

      // Author
      y += fontSize * 0.4;
      ctx.font = `600 26px ${font}`;
      ctx.fillStyle = "#5EEAD4";
      ctx.fillText(`— ${quote.author || "LifeOS"}`, padX, y);

      // Footer
      ctx.font = `500 17px ${font}`;
      ctx.fillStyle = "rgba(250, 250, 249, 0.55)";
      ctx.fillText("LifeOS · Second Brain & AI Personal Assistant", padX, cfg.h - 60);

      setReady(true);
    } catch {
      toast.error("Gagal memuat gambar background — coba lagi");
    } finally {
      setLoading(false);
    }
  }, [quote, ratio]);

  // Render ulang saat modal terbuka / quote / rasio berubah
  React.useEffect(() => {
    if (open && quote) {
      const t = setTimeout(() => void drawPoster(), 80);
      return () => clearTimeout(t);
    }
  }, [open, quote, ratio, drawPoster]);

  const download = () => {
    if (!canvasRef.current || !ready) return;
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = `poster-quote-${RATIOS[ratio].sub.replace(/\s/g, "-").toLowerCase()}-${(quote?.topic || "motivasi").replace(/[^a-z0-9]/gi, "-")}-${quote?.id ?? ""}.png`;
    a.click();
    toast.success("Poster diunduh 🖼️");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="size-4 text-primary" /> Poster quotes
          </DialogTitle>
        </DialogHeader>

        {/* Pilihan rasio */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(RATIOS) as Ratio[]).map((r) => (
            <button
              key={r}
              onClick={() => setRatio(r)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-left transition-colors",
                ratio === r
                  ? "border-primary/50 bg-primary/10"
                  : "border-border hover:bg-muted/40"
              )}
            >
              <span className={cn("block text-[11px] font-semibold", ratio === r ? "text-primary" : "text-foreground")}>
                {RATIOS[r].label}
              </span>
              <span className="block text-[9px] text-muted-foreground">
                {RATIOS[r].sub} · {RATIOS[r].w}×{RATIOS[r].h}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex justify-center">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Menyiapkan poster…
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={RATIOS[ratio].w}
            height={RATIOS[ratio].h}
            className="max-h-[55vh] w-auto max-w-full rounded-lg border border-border/60 shadow-sm"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button onClick={download} disabled={!ready} className="gap-1.5">
            <Download className="size-4" /> Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
