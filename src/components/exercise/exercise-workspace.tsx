"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Apple,
  BedDouble,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Flame,
  Loader2,
  Moon,
  Search,
  Sparkles,
  Target,
  Trash2,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ExerciseProgramItem {
  id: number;
  goal: string;
  program: string;
  createdAt: string;
}

export interface ProgramData {
  judul: string;
  ringkasan: string;
  durasiProgram: string;
  frekuensi: string;
  makanan: { makan: string; kapan: string; catatan: string }[];
  olahraga: { nama: string; frekuensi: string; durasi: string }[];
  gerakan: { nama: string; set: string; repetisi: string; istirahat: string; catatan: string }[];
  diet: string[];
  istirahat: { tidur: string; recovery: string; catatan: string };
  catatan: string;
}

function parseProgram(raw: string): ProgramData | null {
  try {
    return JSON.parse(raw) as ProgramData;
  } catch {
    return null;
  }
}

/** Halaman Exercise — training program terintegrasi AI (makan, olahraga, gerakan, diet, istirahat). */
export function ExerciseWorkspace() {
  const [items, setItems] = React.useState<ExerciseProgramItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [goal, setGoal] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ExerciseProgramItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // ── Filter ──
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<"terbaru" | "terlama">("terbaru");

  const loadAll = React.useCallback(async () => {
    try {
      const res = await fetch("/api/exercise");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast.error("Gagal memuat program");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/exercise")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setItems(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat program");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = async () => {
    const g = goal.trim();
    if (!g) {
      toast.error("Tulis dulu tujuan latihanmu 🎯");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: g }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success("Program dibuat! 💪");
      setGoal("");
      await loadAll();
      setOpenId(json.data.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal generate program");
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (item: ExerciseProgramItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/exercise/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Program dihapus");
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
      const data = parseProgram(it.program);
      return (
        it.goal.toLowerCase().includes(q) ||
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
            <Dumbbell className="size-5 text-primary" />
          </span>
          Exercise
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Training program terintegrasi AI — makanan, olahraga, gerakan, diet & pola istirahat.
        </p>
      </header>

      {/* ── Form tujuan ── */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-4 shadow-sm">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Target className="size-4 text-primary" /> Apa tujuan latihanmu?
        </p>
        <Textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder='mis. "Saya ingin memperbesar lengan saya" — AI akan breakdown program makanan, olahraga, gerakan, diet & pola istirahat…'
          rows={2}
          className="resize-none text-sm"
        />
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {["Memperkecil perut", "Memperbesar lengan", "Membentuk dada", "Menurunkan berat badan"].map((s) => (
              <button
                key={s}
                onClick={() => setGoal(s)}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
          <Button onClick={() => void generate()} disabled={generating} className="h-9 shrink-0 gap-1.5">
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? "Menyusun program…" : "Buat program"}
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
            placeholder="Cari program…"
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
          Menampilkan {filtered.length} dari {items.length} program
        </span>
      </div>

      {/* ── List 3 kolom card ── */}
      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Memuat program…
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {items.length === 0 ? "Belum ada program — tulis tujuanmu di atas! 💪" : "Tidak ada program yang cocok dengan filter."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const data = parseProgram(item.program);
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
                    <Dumbbell className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug font-semibold break-words [overflow-wrap:anywhere]">{data?.judul ?? item.goal}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                      {format(new Date(item.createdAt.replace(" ", "T") + "Z"), "d MMM yyyy HH:mm", { locale: id })}
                    </span>
                  </span>
                  {open ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                </button>

                {/* Isi card */}
                <div className="flex flex-1 flex-col px-3.5 pb-3">
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground italic">
                    🎯 {item.goal}
                  </p>
                  {data && (
                    <>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-2 py-1.5">
                          <Flame className="size-3.5 shrink-0 text-orange-500" />
                          <span className="text-[11px] font-semibold">{data.durasiProgram}</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-2 py-1.5">
                          <Dumbbell className="size-3.5 shrink-0 text-primary" />
                          <span className="line-clamp-1 text-[11px]">{data.frekuensi}</span>
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                        <span className="rounded-full bg-muted/60 px-1.5 py-0.5">🏋️ {data.gerakan.length} gerakan</span>
                        <span className="rounded-full bg-muted/60 px-1.5 py-0.5">🍽️ {data.makanan.length} makanan</span>
                        <span className="rounded-full bg-muted/60 px-1.5 py-0.5">💤 {data.istirahat.tidur}</span>
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
                    aria-label="Hapus program"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>

                {/* Detail expand */}
                {open && data && (
                  <div className="border-t border-border/60 px-3.5 pb-3.5 pt-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">{data.ringkasan}</p>

                    {data.makanan.length > 0 && (
                      <>
                        <p className="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          <Utensils className="size-3" /> Program makanan
                        </p>
                        <div className="mt-1 space-y-1.5">
                          {data.makanan.map((m, i) => (
                            <div key={i} className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-semibold">{m.makan}</span>
                                <Badge variant="secondary" className="text-[9px]">{m.kapan}</Badge>
                              </div>
                              {m.catatan && <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{m.catatan}</p>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {data.olahraga.length > 0 && (
                      <>
                        <p className="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          <Flame className="size-3" /> Olahraga / kardio
                        </p>
                        <div className="mt-1 space-y-1.5">
                          {data.olahraga.map((o, i) => (
                            <div key={i} className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
                              <p className="text-xs font-semibold">{o.nama}</p>
                              <p className="text-[10px] text-muted-foreground">{o.frekuensi} · {o.durasi}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {data.gerakan.length > 0 && (
                      <>
                        <p className="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          <Dumbbell className="size-3" /> Gerakan inti
                        </p>
                        <div className="mt-1 space-y-1.5">
                          {data.gerakan.map((g, i) => (
                            <div key={i} className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
                              <p className="text-xs font-semibold">{i + 1}. {g.nama}</p>
                              <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                                <span className="rounded-full bg-muted/60 px-1.5 py-0.5">Set: {g.set}</span>
                                <span className="rounded-full bg-muted/60 px-1.5 py-0.5">Reps: {g.repetisi}</span>
                                {g.istirahat && <span className="rounded-full bg-muted/60 px-1.5 py-0.5">Istirahat: {g.istirahat}</span>}
                              </div>
                              {g.catatan && <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">💡 {g.catatan}</p>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {data.diet.length > 0 && (
                      <>
                        <p className="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          <Apple className="size-3" /> Panduan diet
                        </p>
                        <ul className="mt-1 space-y-1">
                          {data.diet.map((d, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                              <span className="mt-1 size-1 shrink-0 rounded-full bg-emerald-500" /> {d}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <p className="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-500">
                      <Moon className="size-3" /> Pola istirahat
                    </p>
                    <div className="mt-1 space-y-1.5">
                      <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
                        <p className="flex items-center gap-1 text-[11px] font-semibold">
                          <BedDouble className="size-3 text-indigo-500" /> Tidur
                        </p>
                        <p className="text-[10px] leading-relaxed text-muted-foreground">{data.istirahat.tidur}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
                        <p className="flex items-center gap-1 text-[11px] font-semibold">
                          <Flame className="size-3 text-indigo-500" /> Recovery
                        </p>
                        <p className="text-[10px] leading-relaxed text-muted-foreground">{data.istirahat.recovery}</p>
                      </div>
                    </div>
                    {data.istirahat.catatan && (
                      <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">💡 {data.istirahat.catatan}</p>
                    )}

                    {data.catatan && (
                      <p className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                        📌 {data.catatan}
                      </p>
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
        title="Hapus program"
        description={`Hapus program "${deleteTarget?.goal}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
