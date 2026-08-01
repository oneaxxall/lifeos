"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Apple,
  Beef,
  ChevronDown,
  ChevronRight,
  Clock3,
  Flame,
  Leaf,
  Loader2,
  Search,
  Soup,
  Sparkles,
  Trash2,
  Users,
  Utensils,
  Wheat,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface FoodRecipeItem {
  id: number;
  title: string;
  request: string;
  recipe: string;
  createdAt: string;
}

export interface RecipeData {
  judul: string;
  deskripsi: string;
  porsi: string;
  waktu: string;
  bahan: string[];
  langkah: string[];
  gizi: { kalori: string; protein: string; karbohidrat: string; lemak: string; serat: string };
  vitamin: { nama: string; manfaat: string }[];
  manfaat: string[];
}

function parseRecipe(raw: string): RecipeData | null {
  try {
    return JSON.parse(raw) as RecipeData;
  } catch {
    return null;
  }
}

/** Halaman Food — minta resep ke AI, dapat kandungan gizi, vitamin & manfaat. */
export function FoodWorkspace() {
  const [items, setItems] = React.useState<FoodRecipeItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [request, setRequest] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<FoodRecipeItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // ── Filter ──
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<"terbaru" | "terlama">("terbaru");

  const loadAll = React.useCallback(async () => {
    try {
      const res = await fetch("/api/food");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast.error("Gagal memuat resep");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/food")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setItems(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat resep");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = async () => {
    const r = request.trim();
    if (!r) {
      toast.error("Tulis dulu makanan/resep yang kamu inginkan 🥗");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: r }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success("Resep dibuat! 🍳");
      setRequest("");
      await loadAll();
      setOpenId(json.data.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal generate resep");
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (item: FoodRecipeItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/food/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Resep dihapus");
      setDeleteTarget(null);
      await loadAll();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  // Filter + urut
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((it) => {
      if (!q) return true;
      const data = parseRecipe(it.recipe);
      return (
        it.title.toLowerCase().includes(q) ||
        it.request.toLowerCase().includes(q) ||
        (data?.judul ?? "").toLowerCase().includes(q)
      );
    });
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
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <Utensils className="size-5 text-primary" />
          </span>
          Food
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Minta resep ke AI — dapatkan kandungan gizi, vitamin & manfaatnya sekaligus.
        </p>
      </header>

      {/* ── Form minta resep ── */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-4 shadow-sm">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Soup className="size-4 text-primary" /> Minta resep ke AI
        </p>
        <Textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="mis. Resep ayam goreng sehat rendah lemak untuk makan malam, atau: resep sop sayur kaya vitamin C…"
          rows={2}
          className="resize-none text-sm"
        />
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {["Nasi goreng sehat", "Sop ayam vitamin", "Salad protein tinggi"].map((s) => (
              <button
                key={s}
                onClick={() => setRequest(s)}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
          <Button onClick={() => void generate()} disabled={generating} className="h-9 shrink-0 gap-1.5">
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? "Membuat resep…" : "Buat resep"}
          </Button>
        </div>
      </div>

      {/* ── Filter bar — mobile: semua ke bawah ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs sm:flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari resep…"
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
          Menampilkan {filtered.length} dari {items.length} resep
        </span>
      </div>

      {/* ── List 3 kolom card ── */}
      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Memuat resep…
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {items.length === 0 ? "Belum ada resep — minta resep pertama di atas! 🍳" : "Tidak ada resep yang cocok dengan filter."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const data = parseRecipe(item.recipe);
            const open = openId === item.id;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-colors",
                  open ? "border-primary/30 shadow-md" : "border-border/60 hover:border-primary/20"
                )}
              >
                {/* Header card */}
                <button
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Utensils className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug font-semibold break-words [overflow-wrap:anywhere]">{data?.judul ?? item.title}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                      {format(new Date(item.createdAt.replace(" ", "T") + "Z"), "d MMM yyyy HH:mm", { locale: id })}
                    </span>
                  </span>
                  {open ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                </button>

                {/* Isi card */}
                <div className="flex flex-1 flex-col px-3.5 pb-3">
                  {item.request && (
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground italic">
                      &quot;{item.request}&quot;
                    </p>
                  )}
                  {data && (
                    <>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {[
                          { label: "Kalori", value: data.gizi.kalori, icon: Flame, cls: "text-orange-500" },
                          { label: "Protein", value: data.gizi.protein, icon: Beef, cls: "text-rose-500" },
                          { label: "Karbohidrat", value: data.gizi.karbohidrat, icon: Wheat, cls: "text-amber-500" },
                          { label: "Lemak", value: data.gizi.lemak, icon: Zap, cls: "text-indigo-500" },
                        ].map((g) => (
                          <div key={g.label} className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
                            <g.icon className={cn("mx-auto size-3.5", g.cls)} />
                            <p className="mt-0.5 text-[11px] font-semibold tabular-nums">{g.value}</p>
                            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">{g.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        {data.porsi && <span className="flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5"><Users className="size-3" /> {data.porsi}</span>}
                        {data.waktu && <span className="flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5"><Clock3 className="size-3" /> {data.waktu}</span>}
                        {data.gizi.serat && <span className="flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5"><Leaf className="size-3 text-emerald-500" /> Serat {data.gizi.serat}</span>}
                      </div>
                    </>
                  )}
                </div>

                {/* Footer card */}
                <div className="flex items-center gap-1 border-t border-border/50 bg-muted/20 px-3 py-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 text-[11px] text-primary hover:text-primary"
                    onClick={() => setOpenId(open ? null : item.id)}
                  >
                    {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                    {open ? "Tutup detail" : "Lihat detail"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-6 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="Hapus resep"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>

                {/* Detail expand */}
                {open && data && (
                  <div className="border-t border-border/60 px-3.5 pb-3.5 pt-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">{data.deskripsi}</p>

                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-primary">🛒 Bahan</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      {data.bahan.map((b, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="mt-1 size-1 shrink-0 rounded-full bg-primary/50" /> {b}
                        </li>
                      ))}
                    </ul>

                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-primary">👨‍🍳 Langkah</p>
                    <ol className="mt-1 space-y-1.5">
                      {data.langkah.map((l, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
                            {i + 1}
                          </span>
                          {l}
                        </li>
                      ))}
                    </ol>

                    {data.vitamin.length > 0 && (
                      <>
                        <p className="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          <Apple className="size-3" /> Kandungan vitamin
                        </p>
                        <div className="mt-1 space-y-1.5">
                          {data.vitamin.map((v, i) => (
                            <div key={i} className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5">
                              <p className="text-[11px] font-semibold text-foreground/80">{v.nama}</p>
                              <p className="text-[10px] leading-relaxed text-muted-foreground">{v.manfaat}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {data.manfaat.length > 0 && (
                      <>
                        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          💚 Manfaat untuk tubuh
                        </p>
                        <ul className="mt-1 space-y-1">
                          {data.manfaat.map((m, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                              <span className="mt-1 size-1 shrink-0 rounded-full bg-emerald-500" /> {m}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus resep"
        description={`Hapus resep "${deleteTarget?.title}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
