"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Images,
  Loader2,
  Palette,
  Search,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { parseCarousel, type CarouselItem } from "@/components/carousel/carousel-preview";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Branding } from "@/lib/carousel-renderer";

const THEME_OPTIONS = [
  { value: "teal", label: "Teal 🌊" },
  { value: "emas", label: "Emas 🟡" },
  { value: "lavender", label: "Lavender 💜" },
  { value: "gelap", label: "Gelap 🖤" },
  { value: "terang", label: "Terang ⚪" },
];

const BG_OPTIONS = [
  { value: "ai", label: "AI Design", desc: "Background unik dari spesifikasi AI", icon: "✨" },
  { value: "gambar", label: "Gambar", desc: "Foto open source (Picsum)", icon: "🖼️" },
  { value: "gradient", label: "Gradient", desc: "Gradasi halus tema warna", icon: "🎨" },
] as const;

/** Palet warna tema untuk swatch. */
const THEME_SWATCHES: Record<string, string[]> = {
  teal: ["#0D9488", "#134E4A", "#5EEAD4"],
  emas: ["#F59E0B", "#92400E", "#FDE68A"],
  lavender: ["#8B5CF6", "#4C1D95", "#C4B5FD"],
  gelap: ["#0F172A", "#020617", "#334155"],
  terang: ["#F8FAFC", "#E2E8F0", "#94A3B8"],
};

/** Halaman Carousel — generator carousel Instagram: AI konten + background + branding. */
export function CarouselWorkspace() {
  const router = useRouter();
  const [items, setItems] = React.useState<CarouselItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [branding, setBranding] = React.useState<Branding | null>(null);

  // Form generate
  const [topic, setTopic] = React.useState("");
  const [slideCount, setSlideCount] = React.useState(5);
  const [theme, setTheme] = React.useState("teal");
  const [bgSource, setBgSource] = React.useState<"ai" | "gambar" | "gradient">("ai");
  const [contentStyle, setContentStyle] = React.useState<"ringkas" | "informatif">("informatif");
  const [generating, setGenerating] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);

  // Settings
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<CarouselItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Settings form
  const [sBrandName, setSBrandName] = React.useState("LifeOS");
  const [sHandle, setSHandle] = React.useState("@lifeos");
  const [sTagline, setSTagline] = React.useState("");
  const [sInitials, setSInitials] = React.useState("L");
  const [sShowBranding, setSShowBranding] = React.useState(true);
  const [sSaving, setSSaving] = React.useState(false);

  // Filter
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<"terbaru" | "terlama">("terbaru");

  const loadAll = React.useCallback(async () => {
    try {
      const res = await fetch("/api/carousels");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast.error("Gagal memuat carousel");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/carousels").then((r) => r.json()),
      fetch("/api/carousel-settings").then((r) => r.json()),
    ])
      .then(([c, s]) => {
        if (cancelled) return;
        setItems(c.data ?? []);
        if (s.data) setBranding(s.data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = async () => {
    const t = topic.trim();
    if (!t) {
      toast.error("Tulis dulu topik carousel-nya 🎠");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/carousels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t, slideCount, theme, bgSource, contentStyle }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success("Carousel dibuat! 🎠");
      setTopic("");
      await loadAll();
      router.push(`/carousel/${json.data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal generate carousel");
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (item: CarouselItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/carousels/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Carousel dihapus");
      setDeleteTarget(null);
      await loadAll();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
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

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((it) => !q || it.topic.toLowerCase().includes(q));
    return sort === "terbaru" ? list : [...list].reverse();
  }, [items, query, sort]);

  const resetFilters = () => {
    setQuery("");
    setSort("terbaru");
  };

  return (
    <div className="space-y-5">
      {/* ── Header halaman ── */}
      <header>
        <div className="flex items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
              <Images className="size-5 text-primary" />
            </span>
            Carousel
          </h1>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={openSettings}>
            <Settings2 className="size-3.5" /> Branding
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Generator carousel Instagram dengan AI — konten, background, & branding dalam sekali klik.
        </p>
      </header>

      {/* ── Form generate (collapsible — default tertutup) ── */}
      <div className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
        <button
          onClick={() => setFormOpen((o) => !o)}
          className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Generate carousel baru</span>
            <span className="block text-[11px] text-muted-foreground">
              AI menyusun konten slide, background design & caption dalam sekali generate
            </span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", formOpen && "rotate-180")} />
        </button>

        {formOpen && (
        <div className="space-y-4 border-t border-border/40 p-4">
          {/* Step 1 — Topik */}
          <div>
            <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold">
              <span className="flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">1</span>
              Topik carousel
            </p>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="mis. '3 Kebiasaan Hemat untuk Anak Kos'…"
              className="h-10 text-sm"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {["3 Kebiasaan Hemat", "Tips Produktif Pagi", "5 Ide Konten Viral", "Cara Mulai Affiliate"].map((s) => (
                <button
                  key={s}
                  onClick={() => setTopic(s)}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Konfigurasi */}
          <div>
            <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold">
              <span className="flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">2</span>
              Konfigurasi
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Jumlah slide — slider */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Jumlah slide
                  </label>
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                    {slideCount}
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={10}
                  step={1}
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                />
                <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground">
                  <span>3</span>
                  <span>5</span>
                  <span>7</span>
                  <span>10</span>
                </div>
                <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                  = <b className="text-foreground/70">{slideCount + 2} slide total</b> (1 HOOK + {slideCount} isi + 1 CTA)
                </p>
              </div>

              {/* Tema warna — swatch */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Tema warna
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {THEME_OPTIONS.map((t) => {
                    const palet = THEME_SWATCHES[t.value] ?? THEME_SWATCHES.teal;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        title={t.label}
                        className={cn(
                          "rounded-lg border p-1.5 transition-colors",
                          theme === t.value ? "border-primary/60 bg-primary/10" : "border-border hover:bg-muted/40"
                        )}
                      >
                        <span className="mx-auto flex h-7 w-full items-center justify-center overflow-hidden rounded-md">
                          <span className="h-full w-1/3" style={{ background: palet[0] }} />
                          <span className="h-full w-1/3" style={{ background: palet[1] }} />
                          <span className="h-full w-1/3" style={{ background: palet[2] }} />
                        </span>
                        <span className="mt-1 block truncate text-center text-[9px] text-muted-foreground">
                          {t.label.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Background */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Sumber background
                </label>
                <div className="space-y-1.5">
                  {BG_OPTIONS.map((b) => (
                    <button
                      key={b.value}
                      onClick={() => setBgSource(b.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                        bgSource === b.value
                          ? "border-primary/50 bg-primary/10"
                          : "border-border hover:bg-muted/40"
                      )}
                    >
                      <span className="text-base leading-none">{b.icon}</span>
                      <span className="min-w-0">
                        <span className={cn("block text-[11px] font-semibold", bgSource === b.value ? "text-primary" : "text-foreground")}>
                          {b.label}
                        </span>
                        <span className="block truncate text-[9px] text-muted-foreground">{b.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Gaya konten */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Gaya konten
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={() => setContentStyle("ringkas")}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  contentStyle === "ringkas" ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/40"
                )}
              >
                <span className={cn("block text-xs font-semibold", contentStyle === "ringkas" ? "text-primary" : "text-foreground")}>
                  ⚡ Ringkas
                </span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">
                  Poin pendek & padat — cocok untuk tips cepat yang mudah discan.
                </span>
              </button>
              <button
                onClick={() => setContentStyle("informatif")}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  contentStyle === "informatif" ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/40"
                )}
              >
                <span className={cn("block text-xs font-semibold", contentStyle === "informatif" ? "text-primary" : "text-foreground")}>
                  📖 Informatif
                </span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">
                  Paragraf panjang 2-4 kalimat per poin — penuh data & nilai edukasi.
                </span>
              </button>
            </div>
          </div>

          {/* Step 3 — Generate */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
            <p className="text-[11px] text-muted-foreground">
              {slideCount} slide · Tema {THEME_OPTIONS.find((t) => t.value === theme)?.label.split(" ")[0]} ·{" "}
              {BG_OPTIONS.find((b) => b.value === bgSource)?.label}
            </p>
            <Button onClick={() => void generate()} disabled={generating} className="h-10 gap-1.5 px-5">
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {generating ? "Menyusun carousel…" : "Generate carousel"}
            </Button>
          </div>
        </div>
        )}
      </div>

      {/* ── Filter bar — mobile: semua ke bawah ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs sm:flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari carousel…"
            className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "terbaru" | "terlama")}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          >
            <option value="terbaru">🕒 Terbaru</option>
            <option value="terlama">Terlama</option>
          </select>
          {(query || sort !== "terbaru") && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>
              Reset
            </Button>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground sm:ml-auto">
          Menampilkan {filtered.length} dari {items.length} carousel
        </span>
      </div>

      {/* ── List 3 kolom card ── */}
      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Memuat carousel…
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {items.length === 0 ? "Belum ada carousel — generate yang pertama di atas! 🎠" : "Tidak ada carousel yang cocok dengan filter."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const data = parseCarousel(item.content);
            return (
              <div
                key={item.id}
                className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-colors hover:border-primary/20 hover:shadow-md"
              >
                {/* Header card */}
                <Link
                  href={`/carousel/${item.id}`}
                  className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Images className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug font-semibold break-words [overflow-wrap:anywhere]">
                      {data?.judul ?? item.topic}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                      {format(new Date(item.createdAt.replace(" ", "T") + "Z"), "d MMM yyyy HH:mm", { locale: id })}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>

                {/* Isi card */}
                <div className="flex flex-1 flex-col px-3.5 pb-3">
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground italic">
                    🎯 {item.topic}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                    <span className="rounded-full bg-muted/60 px-1.5 py-0.5">🖼️ {item.slideCount} slide</span>
                    <span className="rounded-full bg-muted/60 px-1.5 py-0.5">
                      <Palette className="mr-0.5 inline size-2.5" />
                      {THEME_OPTIONS.find((t) => t.value === item.theme)?.label.split(" ")[0] ?? item.theme}
                    </span>
                    <span className="rounded-full bg-muted/60 px-1.5 py-0.5">
                      {BG_OPTIONS.find((b) => b.value === item.bgSource)?.label.split(" ")[0] ?? item.bgSource}
                    </span>
                  </div>
                  {data && (
                    <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                      {data.hashtags.slice(0, 5).join(" ")}
                    </p>
                  )}
                </div>

                {/* Footer card */}
                <div className="flex items-center gap-1 border-t border-border/50 bg-muted/20 px-3 py-1.5">
                  <Link
                    href={`/carousel/${item.id}`}
                    className="inline-flex h-6 items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80"
                  >
                    <ImageIcon className="size-3" /> Edit & download
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-6 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="Hapus carousel"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Handle Instagram
                </label>
                <Input value={sHandle} onChange={(e) => setSHandle(e.target.value)} placeholder="@lifeos.tips" className="h-9 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Inisial logo
                </label>
                <Input value={sInitials} onChange={(e) => setSInitials(e.target.value)} placeholder="LT" className="h-9 text-sm" maxLength={3} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Tagline
              </label>
              <Textarea
                value={sTagline}
                onChange={(e) => setSTagline(e.target.value)}
                placeholder="Tips hemat & produktif tiap hari"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={sShowBranding}
                onChange={(e) => setSShowBranding(e.target.checked)}
                className="size-3.5 accent-primary"
              />
              Tampilkan branding di header & footer slide
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void saveSettings()} disabled={sSaving} className="gap-1.5">
              {sSaving && <Loader2 className="size-4 animate-spin" />}
              Simpan branding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus carousel"
        description={`Hapus carousel "${deleteTarget?.topic}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
