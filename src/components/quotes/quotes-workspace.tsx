"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  ChevronDown,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Quote,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PosterDialog } from "@/components/quotes/poster-dialog";
import { PERSONALITIES } from "@/lib/quote-personalities";
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

export interface TopicItem {
  id: number;
  name: string;
  personality: string;
  description: string;
  active: boolean;
}

/** Halaman Quotes — riwayat lengkap + generate advance (topik & personality) + edit + kelola topik. */
export function QuotesWorkspace() {
  const [quotes, setQuotes] = React.useState<QuoteItem[]>([]);
  const [topics, setTopics] = React.useState<TopicItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [topic, setTopic] = React.useState("motivasi");
  const [personality, setPersonality] = React.useState<string>("bijak");
  const [count, setCount] = React.useState(3);
  const [context, setContext] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<QuoteItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [posterTarget, setPosterTarget] = React.useState<QuoteItem | null>(null);

  // Edit quote
  const [editTarget, setEditTarget] = React.useState<QuoteItem | null>(null);
  const [editContent, setEditContent] = React.useState("");
  const [editAuthor, setEditAuthor] = React.useState("");
  const [editTopic, setEditTopic] = React.useState("");
  const [editing, setEditing] = React.useState(false);

  // Kelola topik
  const [topicDialogOpen, setTopicDialogOpen] = React.useState(false);
  const [topicName, setTopicName] = React.useState("");
  const [topicPersonality, setTopicPersonality] = React.useState("bijak");
  const [topicDesc, setTopicDesc] = React.useState("");
  const [savingTopic, setSavingTopic] = React.useState(false);
  const [deletingTopic, setDeletingTopic] = React.useState<number | null>(null);

  // ── Filter ──
  const [query, setQuery] = React.useState("");
  const [topicFilter, setTopicFilter] = React.useState("all");
  const [monthFilter, setMonthFilter] = React.useState("all");

  const loadAll = React.useCallback(async () => {
    try {
      const [q, t] = await Promise.all([
        fetch("/api/quotes").then((r) => r.json()),
        fetch("/api/quote-topics?all=1").then((r) => r.json()),
      ]);
      setQuotes(q.data ?? []);
      setTopics(t.data ?? []);
    } catch {
      toast.error("Gagal memuat quotes");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/quotes").then((r) => r.json()),
      fetch("/api/quote-topics?all=1").then((r) => r.json()),
    ])
      .then(([q, t]) => {
        if (cancelled) return;
        setQuotes(q.data ?? []);
        setTopics(t.data ?? []);
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
        body: JSON.stringify({ count, topic, personality, context }),
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

  /* ── Edit quote ── */
  const openEdit = (q: QuoteItem) => {
    setEditTarget(q);
    setEditContent(q.content);
    setEditAuthor(q.author);
    setEditTopic(q.topic);
  };
  const saveEdit = async () => {
    if (!editTarget) return;
    setEditing(true);
    try {
      const res = await fetch(`/api/quotes/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent, author: editAuthor, topic: editTopic }),
      });
      if (!res.ok) throw new Error();
      toast.success("Quote diperbarui ✏️");
      setEditTarget(null);
      await loadAll();
    } catch {
      toast.error("Gagal menyimpan edit");
    } finally {
      setEditing(false);
    }
  };

  /* ── Kelola topik ── */
  const addTopic = async () => {
    if (!topicName.trim()) {
      toast.error("Isi nama topik dulu 🏷️");
      return;
    }
    setSavingTopic(true);
    try {
      const res = await fetch("/api/quote-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: topicName, personality: topicPersonality, description: topicDesc }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success("Topik ditambahkan 🏷️");
      setTopicName("");
      setTopicDesc("");
      setTopicPersonality("bijak");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah topik");
    } finally {
      setSavingTopic(false);
    }
  };
  const toggleTopic = async (t: TopicItem) => {
    await fetch(`/api/quote-topics/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !t.active }),
    });
    await loadAll();
  };
  const setTopicPersonalityOf = async (t: TopicItem, personality: string) => {
    await fetch(`/api/quote-topics/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personality }),
    });
    await loadAll();
  };
  const deleteTopic = async (t: TopicItem) => {
    setDeletingTopic(t.id);
    try {
      const res = await fetch(`/api/quote-topics/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Topik dihapus");
      await loadAll();
    } catch {
      toast.error("Gagal menghapus topik");
    } finally {
      setDeletingTopic(null);
    }
  };

  /* ── Filter helpers ── */
  const allTopicNames = React.useMemo(() => {
    const s = new Set(topics.map((t) => t.name));
    quotes.forEach((q) => q.topic && s.add(q.topic));
    return Array.from(s).sort();
  }, [topics, quotes]);

  const topicCount = (t: string) => quotes.filter((q) => q.topic === t).length;

  const monthOptions = React.useMemo(() => {
    const s = new Set(quotes.map((q) => q.date.slice(0, 7)));
    return Array.from(s).sort().reverse();
  }, [quotes]);

  const filtered = React.useMemo(() => {
    const qq = query.trim().toLowerCase();
    return quotes.filter(
      (q) =>
        (!qq || q.content.toLowerCase().includes(qq) || (q.author || "").toLowerCase().includes(qq)) &&
        (topicFilter === "all" || q.topic === topicFilter) &&
        (monthFilter === "all" || q.date.startsWith(monthFilter))
    );
  }, [quotes, query, topicFilter, monthFilter]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, QuoteItem[]>();
    filtered.forEach((q) => {
      if (!map.has(q.date)) map.set(q.date, []);
      map.get(q.date)!.push(q);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const activeTopics = topics.filter((t) => t.active);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
              <Quote className="size-5 text-primary" />
            </span>
            Quotes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quote harian dengan kedalaman & personality — generate, edit, kelola topik.
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">{quotes.length} quote tersimpan</Badge>
      </header>

      {/* ── Generate baru (collapsible + advance) ── */}
      <div className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <button onClick={() => setFormOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Wand2 className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Generate quotes</span>
              <span className="block text-[11px] text-muted-foreground">
                Topik + personality + konteks hidupmu — AI membuat quote yang relevan
              </span>
            </span>
            <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", formOpen && "rotate-180")} />
          </button>
          <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1 text-[11px]" onClick={() => setTopicDialogOpen(true)}>
            <Settings2 className="size-3" /> Kelola topik
          </Button>
        </div>

        {formOpen && (
          <div className="space-y-3 border-t border-border/40 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[110px_1fr]">
              {/* Jumlah */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Jumlah quotes</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                  />
                  <span className="w-8 shrink-0 rounded-md bg-primary/10 px-1 py-0.5 text-center text-xs font-bold text-primary">{count}</span>
                </div>
              </div>
              {/* Topik */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tentang apa?</label>
                <div className="flex gap-2">
                  <select
                    value={topics.some((t) => t.name === topic) ? topic : "__custom"}
                    onChange={(e) => {
                      if (e.target.value === "__custom") return;
                      setTopic(e.target.value);
                    }}
                    className="h-9 w-40 rounded-md border border-input bg-background px-2 text-sm capitalize"
                  >
                    {activeTopics.map((t) => (
                      <option key={t.id} value={t.name} className="capitalize">
                        {t.name}
                        {t.personality !== "bijak" ? ` (${t.personality})` : ""}
                      </option>
                    ))}
                    <option value="__custom">✏️ Tulis sendiri…</option>
                  </select>
                  <Input
                    placeholder="atau tulis topik bebas…"
                    value={topics.some((t) => t.name === topic) ? "" : topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="h-9 flex-1 text-sm"
                  />
                </div>
                {activeTopics.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {activeTopics.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTopic(t.name)}
                        title={t.description || undefined}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] capitalize transition-colors",
                          topic === t.name
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Personality */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Personality AI</label>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
                {PERSONALITIES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPersonality(p.value)}
                    className={cn(
                      "rounded-lg border px-2.5 py-2 text-left transition-colors",
                      personality === p.value
                        ? "border-primary/50 bg-primary/10"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <span className={cn("block text-[11px] font-semibold", personality === p.value ? "text-primary" : "text-foreground")}>{p.label}</span>
                    <span className="mt-0.5 block text-[9px] leading-snug text-muted-foreground">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Konteks */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ceritakan situasimu (opsional)
              </label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="mis. Lagi banyak kerjaan dan merasa lelah, baru pindah kota, lagi berjuang bangun usaha…"
                rows={2}
                className="resize-none text-sm"
              />
              <p className="mt-1 flex items-center gap-1 text-[9px] leading-relaxed text-muted-foreground">
                <Sparkles className="size-2.5 shrink-0 text-primary" />
                AI otomatis membaca konteks LifeOS-mu: hari ini, mood terakhir & aktivitas terbaru — quote jadi terasa personal.
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => void generate()} disabled={generating} className="h-9 gap-1.5">
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                {generating ? "Membuat…" : `Generate ${count} quote`}
              </Button>
            </div>
          </div>
        )}
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
          {allTopicNames.map((t) => (
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
                        onClick={() => openEdit(q)}
                        aria-label="Edit quote"
                        title="Edit quote"
                      >
                        <Pencil className="size-3" />
                      </Button>
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

      {/* ── Dialog edit quote ── */}
      <Dialog open={editTarget !== null} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4 text-primary" /> Edit quote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Isi quote</label>
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} className="resize-none text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pengarang</label>
                <Input value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} className="h-9 text-sm" placeholder="AI LifeOS" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Topik</label>
                <Input value={editTopic} onChange={(e) => setEditTopic(e.target.value)} className="h-9 text-sm capitalize" placeholder="motivasi" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Batal</Button>
            <Button onClick={() => void saveEdit()} disabled={editing} className="gap-1.5">
              {editing && <Loader2 className="size-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog kelola topik ── */}
      <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-4 text-primary" /> Kelola topik quotes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Tambah topik */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="mb-2 text-[11px] font-semibold">Tambah topik baru</p>
              <div className="space-y-2">
                <Input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="Nama topik (mis. keuangan, sabar)" className="h-8 text-sm" />
                <div className="flex flex-wrap gap-1">
                  {PERSONALITIES.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setTopicPersonality(p.value)}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                        topicPersonality === p.value ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <Input value={topicDesc} onChange={(e) => setTopicDesc(e.target.value)} placeholder="Deskripsi (opsional)" className="h-8 text-sm" />
                <Button size="sm" className="h-8 w-full gap-1 text-xs" onClick={() => void addTopic()} disabled={savingTopic}>
                  {savingTopic ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                  Tambah topik
                </Button>
              </div>
            </div>

            {/* Daftar topik */}
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {topics.length === 0 && (
                <p className="py-4 text-center text-[11px] text-muted-foreground">Belum ada topik khusus — buat yang pertama! 🏷️</p>
              )}
              {topics.map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-card p-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold capitalize">{t.name}</span>
                    <span className="block text-[9px] text-muted-foreground">{t.description || "—"}</span>
                  </span>
                  <select
                    value={t.personality}
                    onChange={(e) => void setTopicPersonalityOf(t, e.target.value)}
                    className="h-7 rounded-md border border-input bg-background px-1.5 text-[10px]"
                    aria-label={`Personality ${t.name}`}
                  >
                    {PERSONALITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label.split(" ")[1]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => void toggleTopic(t)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                      t.active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {t.active ? "Aktif" : "Nonaktif"}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-destructive"
                    onClick={() => void deleteTopic(t)}
                    disabled={deletingTopic === t.id}
                    aria-label={`Hapus topik ${t.name}`}
                  >
                    {deletingTopic === t.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
