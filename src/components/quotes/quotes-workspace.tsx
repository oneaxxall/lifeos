"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Loader2,
  ImageIcon,
  Quote,
  Search,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PosterDialog } from "@/components/quotes/poster-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface QuoteItem {
  id: number;
  date: string;
  content: string;
  author: string;
  topic: string;
  position: number;
}

const TOPIC_SUGGESTIONS = ["motivasi", "disiplin", "fokus", "keluarga", "kesehatan", "kerja", "hidup"];

/** Halaman Quotes — riwayat lengkap semua quote + generate baru + filter. */
export function QuotesWorkspace() {
  const [quotes, setQuotes] = React.useState<QuoteItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [topic, setTopic] = React.useState("motivasi");
  const [count, setCount] = React.useState(3);
  const [deleteTarget, setDeleteTarget] = React.useState<QuoteItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [posterTarget, setPosterTarget] = React.useState<QuoteItem | null>(null);

  // ── Filter ──
  const [query, setQuery] = React.useState("");
  const [topicFilter, setTopicFilter] = React.useState("all");
  const [monthFilter, setMonthFilter] = React.useState("all");

  const loadAll = React.useCallback(async () => {
    try {
      const res = await fetch("/api/quotes");
      const json = await res.json();
      setQuotes(json.data ?? []);
    } catch {
      toast.error("Gagal memuat quotes");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/quotes")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setQuotes(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat quotes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, topic }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success(`${json.data.length} quote baru tersimpan ✨ (${json.source})`);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal generate quotes");
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (q: QuoteItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotes/${q.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Quote dihapus");
      setDeleteTarget(null);
      await loadAll();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  // ── Filter + grup per tanggal ──
  const monthOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const q of quotes) set.add(q.date.slice(0, 7));
    return [...set].sort().reverse();
  }, [quotes]);

  const filtered = React.useMemo(() => {
    return quotes.filter((q) => {
      const qq = query.trim().toLowerCase();
      if (qq && !`${q.content} ${q.author} ${q.topic}`.toLowerCase().includes(qq)) return false;
      if (topicFilter !== "all" && q.topic !== topicFilter) return false;
      if (monthFilter !== "all" && q.date.slice(0, 7) !== monthFilter) return false;
      return true;
    });
  }, [quotes, query, topicFilter, monthFilter]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, QuoteItem[]>();
    for (const q of filtered) {
      const arr = map.get(q.date) ?? [];
      arr.push(q);
      map.set(q.date, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const topicCount = (t: string) => quotes.filter((q) => q.topic === t).length;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Quote className="size-6 text-primary" /> Quotes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Semua quote harian — lihat kembali quotes kemarin, minggu lalu, atau kapan pun.
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">{quotes.length} quote tersimpan</Badge>
      </header>

      {/* ── Generate baru (sama seperti dashboard) ── */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold">
          <Wand2 className="size-3.5 text-primary" /> Generate quotes hari ini
        </p>
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
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
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Tentang apa?</p>
              <Input
                placeholder="mis. motivasi kerja, disiplin, keluarga…"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <Button onClick={() => void generate()} disabled={generating} className="h-9 gap-1.5">
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              {generating ? "Membuat…" : "Generate"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
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

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari isi quote / pengarang…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="Filter topik"
        >
          <option value="all">🏷️ Semua topik</option>
          {TOPIC_SUGGESTIONS.map((t) => (
            <option key={t} value={t} className="capitalize">{t} ({topicCount(t)})</option>
          ))}
        </select>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="Filter bulan"
        >
          <option value="all">📅 Semua bulan</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>{format(new Date(m + "-01"), "MMMM yyyy", { locale: id })}</option>
          ))}
        </select>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Menampilkan <b className="text-foreground">{filtered.length}</b> dari {quotes.length} quote
      </p>

      {/* ── Riwayat per tanggal ── */}
      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Memuat quotes…
        </div>
      ) : grouped.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {quotes.length === 0
            ? "Belum ada quote — generate yang pertama di atas ✨"
            : "Tidak ada quote yang cocok dengan filter. 🔍"}
        </p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, list]) => (
            <div key={date}>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                  {format(new Date(date + "T00:00:00"), "EEEE, d MMMM yyyy", { locale: id })}
                </span>
                <Badge variant="secondary" className="text-[9px]">{list.length}</Badge>
              </p>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {list.map((q) => (
                  <div
                    key={q.id}
                    className="group relative rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/25 hover:bg-muted/20"
                  >
                    <Quote className="absolute right-3 top-3 size-4 text-primary/20" />
                    <p className="pr-6 font-serif text-sm leading-relaxed">
                      &ldquo;{q.content}&rdquo;
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground/80">— {q.author || "AI LifeOS"}</span>
                      {q.topic && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary capitalize">
                          {q.topic}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-primary"
                        onClick={() => setPosterTarget(q)}
                        aria-label="Buat poster"
                        title="Buat poster"
                      >
                        <ImageIcon className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(q)}
                        aria-label="Hapus quote"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus quote"
        description={`Hapus quote "${deleteTarget?.content.slice(0, 50)}…"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />

      <PosterDialog
        quote={posterTarget}
        open={posterTarget !== null}
        onOpenChange={(o) => !o && setPosterTarget(null)}
      />
    </div>
  );
}
