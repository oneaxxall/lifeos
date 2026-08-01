"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  ChevronDown,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface IdeaItem {
  id: number;
  topic: string;
  format: string;
  ideas: string;
  status: "ide" | "riset" | "produksi" | "posting";
  createdAt: string;
}

export interface IdeasData {
  ideas: { hook: string; hookLine: string }[];
}

function parseIdeas(raw: string): IdeasData | null {
  try {
    return JSON.parse(raw) as IdeasData;
  } catch {
    return null;
  }
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ide: { label: "💡 Ide", cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  riset: { label: "🔍 Riset", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  produksi: { label: "🎬 Produksi", cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  posting: { label: "🚀 Posting", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

const FORMATS = ["review", "tips", "unboxing", "tutorial", "comparison"];

/** Tab Ide Konten — AI generate 5 hook video + status pipeline. */
export function ContentIdeasPanel() {
  const [items, setItems] = React.useState<IdeaItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [topic, setTopic] = React.useState("");
  const [formatType, setFormatType] = React.useState("review");
  const [generating, setGenerating] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<IdeaItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("semua");
  const [sort, setSort] = React.useState<"terbaru" | "terlama">("terbaru");

  const loadAll = React.useCallback(async () => {
    try {
      const res = await fetch("/api/content/ideas");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast.error("Gagal memuat ide");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/content/ideas")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setItems(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat ide");
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
      toast.error("Tulis dulu topik/produknya 💡");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/content/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t, format: formatType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success("5 ide hook dibuat! 💡");
      setTopic("");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal generate ide");
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (item: IdeaItem, status: IdeaItem["status"]) => {
    const res = await fetch(`/api/content/ideas/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status } : x)));
    }
  };

  const remove = async (item: IdeaItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/content/ideas/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Ide dihapus");
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
        (statusFilter === "semua" || it.status === statusFilter)
    );
    return sort === "terbaru" ? list : [...list].reverse();
  }, [items, query, statusFilter, sort]);

  return (
    <div className="space-y-4">
      {/* ── Form generate (collapsible) ── */}
      <div className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
        <button
          onClick={() => setFormOpen((o) => !o)}
          className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lightbulb className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Generate ide konten</span>
            <span className="block text-[11px] text-muted-foreground">
              AI membuat 5 hook video + kalimat pembuka dari topik/produk
            </span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", formOpen && "rotate-180")} />
        </button>

        {formOpen && (
          <div className="space-y-3 border-t border-border/40 p-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Topik / produk
              </label>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="mis. Tumbler murah viral di TikTok, serum wajah untuk kulit berminyak…"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Format konten
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormatType(f)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] capitalize transition-colors",
                      formatType === f ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void generate()} disabled={generating} className="h-9 gap-1.5">
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {generating ? "Membuat ide…" : "Generate 5 ide"}
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
            placeholder="Cari ide…"
            className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="semua">Semua status</option>
            <option value="ide">💡 Ide</option>
            <option value="riset">🔍 Riset</option>
            <option value="produksi">🎬 Produksi</option>
            <option value="posting">🚀 Posting</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "terbaru" | "terlama")}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="terbaru">🕒 Terbaru</option>
            <option value="terlama">Terlama</option>
          </select>
          {(query || statusFilter !== "semua" || sort !== "terbaru") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setQuery("");
                setStatusFilter("semua");
                setSort("terbaru");
              }}
            >
              Reset
            </Button>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground sm:ml-auto">
          Menampilkan {filtered.length} dari {items.length} ide
        </span>
      </div>

      {/* ── List 3 kolom ── */}
      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Memuat ide…
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {items.length === 0 ? "Belum ada ide — generate yang pertama di atas! 💡" : "Tidak ada ide yang cocok dengan filter."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const data = parseIdeas(item.ideas);
            return (
              <div key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-colors hover:border-primary/20 hover:shadow-md">
                {/* Header */}
                <div className="flex items-center gap-2.5 border-b border-border/40 bg-muted/20 px-3.5 py-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Lightbulb className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{item.topic}</span>
                    <span className="block text-[9px] text-muted-foreground">
                      {format(new Date(item.createdAt.replace(" ", "T") + "Z"), "d MMM yyyy HH:mm", { locale: id })} · {item.format}
                    </span>
                  </span>
                  <select
                    value={item.status}
                    onChange={(e) => void updateStatus(item, e.target.value as IdeaItem["status"])}
                    className={cn("h-6 rounded-full border-0 px-1.5 text-[9px] font-semibold", STATUS_META[item.status].cls)}
                  >
                    {Object.entries(STATUS_META).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Isi: 5 hook */}
                <div className="flex-1 space-y-2 px-3.5 py-3">
                  {data?.ideas.map((idea, i) => (
                    <div key={i} className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2">
                      <p className="flex items-start gap-1.5 text-xs font-semibold">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
                          {i + 1}
                        </span>
                        <span className="leading-snug break-words [overflow-wrap:anywhere]">{idea.hook}</span>
                      </p>
                      <p className="mt-1 line-clamp-3 text-[10px] leading-relaxed text-muted-foreground italic">
                        &quot;{idea.hookLine}&quot;
                      </p>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center border-t border-border/50 bg-muted/20 px-3 py-1.5">
                  <span className="text-[10px] text-muted-foreground">{data?.ideas.length ?? 0} ide hook</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-6 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="Hapus ide"
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
        title="Hapus ide"
        description={`Hapus ide "${deleteTarget?.topic}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
