"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Loader2,
  Quote as QuoteIcon,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Quote {
  content: string;
  author: string;
}

const TOPIC_SUGGESTIONS = ["motivasi", "disiplin", "fokus", "keluarga", "kesehatan", "kerja", "hidup"];

/** Slider Quote of the Day — typography dramatis & warm, auto-rotate, modal semua quotes. */
export function QuoteSlider() {
  const [quotes, setQuotes] = React.useState<Quote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [index, setIndex] = React.useState(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [allOpen, setAllOpen] = React.useState(false);
  const [count, setCount] = React.useState(3);
  const [topic, setTopic] = React.useState("motivasi");
  const [generating, setGenerating] = React.useState(false);
  const [fading, setFading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const res = await fetch(`/api/quotes?date=${today}`);
        const json = await res.json();
        if (cancelled) return;
        setQuotes(json.data ?? []);
      } catch {
        if (!cancelled) setQuotes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-rotate setiap 7 detik dengan transisi fade
  React.useEffect(() => {
    if (quotes.length <= 1) return;
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIndex((i) => i + 1);
        setFading(false);
      }, 250);
    }, 7000);
    return () => clearInterval(timer);
  }, [quotes.length]);

  // Clamp index aman (quotes bisa berubah setelah generate)
  const current = quotes.length > 0 ? index % quotes.length : 0;

  const goTo = (i: number) => {
    setFading(true);
    setTimeout(() => {
      setIndex(i);
      setFading(false);
    }, 200);
  };

  const generate = async () => {
    const c = Math.min(10, Math.max(1, Number(count) || 1));
    const t = topic.trim() || "motivasi";
    setGenerating(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: c, topic: t }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Gagal");
      // Quote baru BERTAMBAH — reload semua quote hari ini dari DB (lama + baru)
      const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const allRes = await fetch(`/api/quotes?date=${today}`);
      const allJson = await allRes.json();
      setQuotes(allJson.data ?? json.data ?? []);
      setIndex(0);
      setDialogOpen(false);
      toast.success(`${json.data.length} quotes baru ditambahkan — total ${allJson.data?.length ?? json.data.length} hari ini! ✨`);
    } catch {
      toast.error("Gagal generate quotes");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.12] via-card to-amber-500/[0.06] shadow-sm">
        {loading ? (
          <div className="flex items-center gap-3 px-6 py-8">
            <Loader2 className="size-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memuat quotes…</p>
          </div>
        ) : quotes.length === 0 ? (
          /* Belum ada quotes hari ini */
          <div className="relative flex flex-wrap items-center justify-between gap-3 px-6 py-8">
            <span className="pointer-events-none absolute -top-2 left-4 select-none font-serif text-[96px] leading-none text-primary/10">
              “
            </span>
            <div className="relative flex min-w-0 items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <QuoteIcon className="size-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-wide">Quotes hari ini</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Belum ada quotes hari ini. Generate untuk memulai hari dengan semangat! ✨
                </p>
              </div>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="relative shrink-0 gap-1.5">
              <Wand2 className="size-3.5" /> Generate quotes
            </Button>
          </div>
        ) : (
          /* Slider — typography dramatis */
          <div className="relative px-6 py-7 sm:px-8">
            {/* Quote mark dekoratif besar */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-3 left-5 select-none font-serif text-[110px] leading-none text-primary/15"
            >
              “
            </span>

            {/* Aksi kanan atas */}
            <div className="absolute right-4 top-3 flex items-center gap-1">
              <button
                onClick={() => setAllOpen(true)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                aria-label="Lihat semua quotes"
                title="Lihat semua quotes"
              >
                <LayoutGrid className="size-3" />
                <span className="hidden sm:inline">Semua ({quotes.length})</span>
              </button>
              <button
                onClick={() => setDialogOpen(true)}
                className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-primary"
                aria-label="Generate quotes baru"
                title="Generate quotes baru"
              >
                <Sparkles className="size-3.5" />
              </button>
            </div>

            {/* Konten quote */}
            <div className={cn("pr-10 transition-opacity duration-300", fading && "opacity-0")}>
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                <span className="inline-block h-px w-6 bg-primary/40" />
                Quotes hari ini
                {quotes.length > 1 && (
                  <span className="font-normal text-muted-foreground/70">
                    {current + 1} / {quotes.length}
                  </span>
                )}
              </p>

              {/* Quote utama — font serif besar */}
              <blockquote className="mt-3">
                <p
                  key={current}
                  className="font-serif text-xl font-medium italic leading-relaxed tracking-tight text-foreground sm:text-2xl sm:leading-relaxed"
                >
                  {quotes[current]?.content}
                </p>
                {quotes[current]?.author && (
                  <footer className="mt-3 flex items-center gap-2">
                    <span className="inline-block h-px w-5 bg-amber-500/50" />
                    <cite className="text-xs font-medium not-italic text-amber-600 dark:text-amber-400">
                      {quotes[current].author}
                    </cite>
                  </footer>
                )}
              </blockquote>
            </div>

            {/* Navigasi slider */}
            {quotes.length > 1 && (
              <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-3">
                <div className="flex items-center gap-1.5">
                  {quotes.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      aria-label={`Quote ${i + 1}`}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/50"
                      )}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={() => goTo((current - 1 + quotes.length) % quotes.length)}
                    aria-label="Quote sebelumnya"
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={() => goTo((current + 1) % quotes.length)}
                    aria-label="Quote berikutnya"
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal semua quotes */}
      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="max-h-[75vh] overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border/60 px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <QuoteIcon className="size-4 text-primary" /> Semua quotes hari ini
            </DialogTitle>
            <DialogDescription>
              {quotes.length > 0 ? `${quotes.length} quotes untuk mengiringi harimu.` : "Belum ada quotes."}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[55vh] space-y-3 overflow-y-auto px-6 py-4">
            {quotes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Belum ada quotes — klik Generate untuk membuat.
              </p>
            ) : (
              quotes.map((q, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border p-4 transition-colors",
                    i === current
                      ? "border-primary/40 bg-primary/[0.06]"
                      : "border-border/70 bg-card hover:bg-muted/40"
                  )}
                >
                  <p className="font-serif text-[15px] italic leading-relaxed">“{q.content}”</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-block h-px w-4 bg-amber-500/50" />
                    <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      {q.author || "LifeOS"}
                    </p>
                    {i === current && (
                      <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-semibold text-primary">
                        sedang tampil
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="border-t border-border/60 px-6 py-3">
            <Button variant="outline" size="sm" onClick={() => setAllOpen(false)}>
              Tutup
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { setAllOpen(false); setDialogOpen(true); }}>
              <Wand2 className="size-3.5" /> Generate baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog generate quotes */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="size-4 text-primary" /> Generate quotes hari ini
            </DialogTitle>
            <DialogDescription>
              Buat quotes baru — akan menggantikan quotes hari ini (jika ada).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Jumlah quotes</p>
              <Input
                type="number"
                min={1}
                max={10}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="h-9 w-24 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Tentang apa?</p>
              <Input
                placeholder="mis. motivasi kerja, disiplin, keluarga…"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-9 text-sm"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {TOPIC_SUGGESTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                      topic === t
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={generating}>
              Batal
            </Button>
            <Button onClick={() => void generate()} disabled={generating} className="gap-1.5">
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              {generating ? "Membuat…" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
