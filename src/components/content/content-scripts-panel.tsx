"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquareText,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ScriptItem {
  id: number;
  topic: string;
  ideaId: number | null;
  duration: number;
  script: string;
  createdAt: string;
}

export interface ScriptData {
  judul: string;
  skrip: { bagian: string; teks: string }[];
  caption: string;
  hashtags: string[];
}

function parseScript(raw: string): ScriptData | null {
  try {
    return JSON.parse(raw) as ScriptData;
  } catch {
    return null;
  }
}

const DURATIONS = [30, 45, 60];

const BAGIAN_STYLE: Record<string, string> = {
  hook: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  bridge: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  isi: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  cta: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

/** Tab Naskah — skrip video dari ide (hook→bridge→isi→CTA) + caption + hashtag. */
export function ContentScriptsPanel() {
  const [items, setItems] = React.useState<ScriptItem[]>([]);
  const [ideas, setIdeas] = React.useState<{ id: number; topic: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [topic, setTopic] = React.useState("");
  const [ideaId, setIdeaId] = React.useState<number | null>(null);
  const [duration, setDuration] = React.useState(45);
  const [generating, setGenerating] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ScriptItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [query, setQuery] = React.useState("");
  const [durFilter, setDurFilter] = React.useState("semua");
  const [sort, setSort] = React.useState<"terbaru" | "terlama">("terbaru");

  const loadAll = React.useCallback(async () => {
    try {
      const res = await fetch("/api/content/scripts");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast.error("Gagal memuat naskah");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/content/scripts").then((r) => r.json()),
      fetch("/api/content/ideas").then((r) => r.json()),
    ])
      .then(([s, i]) => {
        if (cancelled) return;
        setItems(s.data ?? []);
        setIdeas((i.data ?? []).map((x: { id: number; topic: string }) => ({ id: x.id, topic: x.topic })));
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

  const pickIdea = (id: number | null) => {
    setIdeaId(id);
    if (id) {
      const found = ideas.find((x) => x.id === id);
      if (found) setTopic(found.topic);
    }
  };

  const generate = async () => {
    const t = topic.trim();
    if (!t) {
      toast.error("Pilih ide atau tulis topik naskahnya 📝");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/content/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t, ideaId, duration }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success("Naskah dibuat! 📝");
      setTopic("");
      setIdeaId(null);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal generate naskah");
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (item: ScriptItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/content/scripts/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Naskah dihapus");
      setDeleteTarget(null);
      await loadAll();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter(
      (it) =>
        (!q || it.topic.toLowerCase().includes(q)) &&
        (durFilter === "semua" || String(it.duration) === durFilter)
    );
    return sort === "terbaru" ? list : [...list].reverse();
  }, [items, query, durFilter, sort]);

  return (
    <div className="space-y-4">
      {/* ── Form generate (collapsible) ── */}
      <div className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
        <button
          onClick={() => setFormOpen((o) => !o)}
          className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageSquareText className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Generate naskah video</span>
            <span className="block text-[11px] text-muted-foreground">
              Skrip hook → bridge → isi → CTA + caption & hashtag TikTok
            </span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", formOpen && "rotate-180")} />
        </button>

        {formOpen && (
          <div className="space-y-3 border-t border-border/40 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Pilih ide (opsional)
                </label>
                <select
                  value={ideaId ?? ""}
                  onChange={(e) => pickIdea(e.target.value ? Number(e.target.value) : null)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">— Tulis topik manual —</option>
                  {ideas.map((x) => (
                    <option key={x.id} value={x.id}>
                      💡 {x.topic}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Durasi
                </label>
                <div className="flex gap-1.5">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors",
                        duration === d ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Topik naskah
              </label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="mis. Review tumbler 20rb — kenapa wajib punya…"
                className="h-9 text-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void generate()} disabled={generating} className="h-9 gap-1.5">
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {generating ? "Menulis naskah…" : "Generate naskah"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Filter ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs sm:flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari naskah…"
            className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={durFilter}
            onChange={(e) => setDurFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="semua">Semua durasi</option>
            <option value="30">30 detik</option>
            <option value="45">45 detik</option>
            <option value="60">60 detik</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "terbaru" | "terlama")}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="terbaru">🕒 Terbaru</option>
            <option value="terlama">Terlama</option>
          </select>
          {(query || durFilter !== "semua" || sort !== "terbaru") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setQuery("");
                setDurFilter("semua");
                setSort("terbaru");
              }}
            >
              Reset
            </Button>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground sm:ml-auto">
          Menampilkan {filtered.length} dari {items.length} naskah
        </span>
      </div>

      {/* ── List 3 kolom ── */}
      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Memuat naskah…
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {items.length === 0 ? "Belum ada naskah — generate yang pertama di atas! 📝" : "Tidak ada naskah yang cocok dengan filter."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const data = parseScript(item.script);
            const open = openId === item.id;
            return (
              <div key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-colors hover:border-primary/20 hover:shadow-md">
                {/* Header */}
                <button
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="flex w-full items-center gap-2.5 border-b border-border/40 bg-muted/20 px-3.5 py-2.5 text-left"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MessageSquareText className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{data?.judul ?? item.topic}</span>
                    <span className="block text-[9px] text-muted-foreground">
                      {format(new Date(item.createdAt.replace(" ", "T") + "Z"), "d MMM yyyy HH:mm", { locale: id })} · {item.duration} detik
                    </span>
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                    ⏱ {item.duration}s
                  </span>
                  {open ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                </button>

                {/* Preview ringkas saat tertutup */}
                {!open && data && data.skrip[0] && (
                  <div className="flex-1 px-3.5 py-3">
                    <div className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2">
                      <span className={cn("rounded px-1.5 py-0.5 text-[8px] font-bold uppercase", BAGIAN_STYLE[data.skrip[0].bagian] ?? "bg-muted text-muted-foreground")}>
                        {data.skrip[0].bagian}
                      </span>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-foreground/85">{data.skrip[0].teks}</p>
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-[9px] text-primary/60">{data.hashtags.slice(0, 6).join(" ")}</p>
                  </div>
                )}

                {/* Detail lengkap (saat terbuka) */}
                {open && (
                  <div className="flex-1 space-y-1.5 px-3.5 py-3">
                    {data?.skrip.map((s, i) => (
                      <div key={i} className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1.5">
                        <span className={cn("rounded px-1.5 py-0.5 text-[8px] font-bold uppercase", BAGIAN_STYLE[s.bagian] ?? "bg-muted text-muted-foreground")}>
                          {s.bagian}
                        </span>
                        <p className="mt-1 text-[10px] leading-relaxed text-foreground/85">{s.teks}</p>
                      </div>
                    ))}
                    {data && (
                      <>
                        <div className="rounded-lg bg-muted/20 px-2.5 py-1.5">
                          <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">Caption</p>
                          <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{data.caption}</p>
                        </div>
                        <p className="text-[9px] leading-relaxed text-primary/60">{data.hashtags.join(" ")}</p>
                      </>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center border-t border-border/50 bg-muted/20 px-3 py-1.5">
                  <span className="text-[10px] text-muted-foreground">{data?.skrip.length ?? 0} bagian skrip</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 gap-1 text-[11px] text-primary hover:text-primary"
                    onClick={() => setOpenId(open ? null : item.id)}
                  >
                    {open ? "Tutup" : "Lihat naskah"}
                    {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="Hapus naskah"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus naskah"
        description={`Hapus naskah "${deleteTarget?.topic}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
