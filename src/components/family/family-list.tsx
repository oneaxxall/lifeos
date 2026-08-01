"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  BookHeart,
  ChevronDown,
  ChevronRight,
  Compass,
  Heart,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FamilyAdvice } from "@/lib/ai/family-advice";

export interface FamilyItem {
  id: number;
  content: string;
  people: string;
  mood: string;
  aiAdvice: string;
  date: string;
}

interface Props {
  items: FamilyItem[];
  onChanged: () => void;
}

const MOOD_OPTIONS = ["Tenang", "Cemas", "Lelah", "Kesal", "Sedih", "Bersyukur", "Campur aduk"];

/** Warna badge mood — komunikatif & hangat. */
const MOOD_STYLE: Record<string, string> = {
  Tenang: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  Cemas: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Lelah: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  Kesal: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  Sedih: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  Bersyukur: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Campur aduk": "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

/** Riwayat curhatan keluarga — tampilan CARD grid + filter lengkap + nasihat AI. */
export function FamilyList({ items, onChanged }: Props) {
  const [deleteTarget, setDeleteTarget] = React.useState<FamilyItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [openId, setOpenId] = React.useState<number | null>(null);

  // ── Filter state ──
  const [query, setQuery] = React.useState("");
  const [moodFilter, setMoodFilter] = React.useState("all");
  const [peopleFilter, setPeopleFilter] = React.useState("all");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"desc" | "asc">("desc");

  const parseAdvice = (raw: string): FamilyAdvice | null => {
    try {
      return JSON.parse(raw) as FamilyAdvice;
    } catch {
      return null;
    }
  };

  const remove = async (item: FamilyItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/family/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Curhatan dihapus");
      setDeleteTarget(null);
      onChanged();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  // ── Opsi filter dari data ──
  const peopleOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const it of items) if (it.people.trim()) set.add(it.people.trim());
    return [...set].sort();
  }, [items]);

  const monthOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const d = new Date(it.date);
      if (!Number.isNaN(d.getTime())) set.add(format(d, "yyyy-MM"));
    }
    return [...set].sort().reverse();
  }, [items]);

  // ── Filter + sort ──
  const filtered = React.useMemo(() => {
    let list = items.filter((it) => {
      const q = query.trim().toLowerCase();
      if (q && !it.content.toLowerCase().includes(q)) return false;
      if (moodFilter !== "all" && it.mood !== moodFilter) return false;
      if (peopleFilter !== "all" && it.people.trim() !== peopleFilter) return false;
      if (monthFilter !== "all") {
        const d = new Date(it.date);
        if (Number.isNaN(d.getTime()) || format(d, "yyyy-MM") !== monthFilter) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortBy === "desc" ? -diff : diff;
    });
    return list;
  }, [items, query, moodFilter, peopleFilter, monthFilter, sortBy]);

  const moodCount = (m: string) => items.filter((i) => i.mood === m).length;

  const filteredCount = filtered.length;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* ── Header + statistik ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <BookHeart className="size-4 text-rose-500" /> Riwayat curhat
          <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          {MOOD_OPTIONS.map((m) => (
            <span key={m} className="rounded-full bg-muted/50 px-2 py-0.5">
              {m} <b className="text-foreground/70">{moodCount(m)}</b>
            </span>
          ))}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari curhatan…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <select
          value={moodFilter}
          onChange={(e) => setMoodFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="Filter suasana hati"
        >
          <option value="all">😊 Semua suasana</option>
          {MOOD_OPTIONS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={peopleFilter}
          onChange={(e) => setPeopleFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="Filter orang terlibat"
        >
          <option value="all">👥 Semua orang</option>
          {peopleOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
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
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "desc" | "asc")}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="Urutkan"
        >
          <option value="desc">🕒 Terbaru</option>
          <option value="asc">🕘 Terlama</option>
        </select>
        {filteredCount !== items.length && (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px] text-muted-foreground" onClick={() => { setQuery(""); setMoodFilter("all"); setPeopleFilter("all"); setMonthFilter("all"); }}>
            Reset
          </Button>
        )}
      </div>

      <p className="mb-2 text-[11px] text-muted-foreground">
        Menampilkan <b className="text-foreground">{filteredCount}</b> dari {items.length} curhatan
      </p>

      {/* ── Grid card ── */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {items.length === 0 ? "Belum ada curhatan — ruang ini selalu terbuka untukmu. 💛" : "Tidak ada curhatan yang cocok dengan filter. 🔍"}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {filtered.map((item) => {
            const advice = parseAdvice(item.aiAdvice);
            const open = openId === item.id;
            const moodStyle = MOOD_STYLE[item.mood] ?? "bg-muted/50 text-muted-foreground";
            return (
              <li
                key={item.id}
                className={cn(
                  "group flex flex-col overflow-hidden rounded-xl border transition-colors",
                  open ? "border-rose-500/30 bg-rose-500/[0.03]" : "border-border/60 hover:border-rose-500/20 hover:bg-muted/20"
                )}
              >
                {/* Header card: tanggal + mood + aksi */}
                <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {format(new Date(item.date), "d MMMM yyyy", { locale: id })}
                  </p>
                  <div className="flex items-center gap-1">
                    {item.mood && (
                      <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-medium", moodStyle)}>
                        {item.mood}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      onClick={() => setDeleteTarget(item)}
                      aria-label={`Hapus curhatan ${item.date}`}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>

                {/* Isi card */}
                <div className="flex-1 px-3 py-2.5">
                  <p className={cn("whitespace-pre-wrap text-[13px] leading-relaxed", !open && "line-clamp-3")}>
                    {item.content}
                  </p>

                  {item.people && (
                    <p className="mt-2 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                      <Users className="size-3" />
                      {item.people.split(",").map((p) => p.trim()).filter(Boolean).map((p, i) => (
                        <span key={i} className="rounded-full bg-muted/60 px-1.5 py-0.5">{p}</span>
                      ))}
                    </p>
                  )}

                  {/* Empati singkat saat tertutup */}
                  {advice && !open && (
                    <button
                      onClick={() => setOpenId(item.id)}
                      className="mt-2 block w-full rounded-md bg-rose-500/5 px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-rose-500/10"
                    >
                      🫂 {advice.empati}
                    </button>
                  )}
                </div>

                {/* Footer: buka nasihat AI */}
                {advice ? (
                  <button
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-3 py-1.5 text-[11px] font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
                  >
                    <span className="flex items-center gap-1">
                      <Heart className="size-3" /> {open ? "Sembunyikan nasihat AI" : "Lihat nasihat AI"}
                    </span>
                    {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                ) : (
                  <div className="border-t border-border/50 px-3 py-1.5 text-[10px] text-muted-foreground/60">
                    Tanpa nasihat AI (mode offline)
                  </div>
                )}

                {/* Nasihat AI lengkap */}
                {advice && open && (
                  <div className="space-y-2 border-t border-rose-500/20 bg-rose-500/[0.02] px-3 pb-3 pt-2.5">
                    {/* Empati */}
                    <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5">
                      <Heart className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                      <p className="text-xs font-medium leading-relaxed">{advice.empati}</p>
                    </div>

                    {/* Perspektif */}
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5">
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-rose-500">
                        <Compass className="size-3" /> Perspektif
                      </p>
                      <p className="text-xs leading-relaxed">{advice.perspektif}</p>
                    </div>

                    {/* Saran */}
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-rose-500">
                        💡 Saran hari ini
                      </p>
                      <ul className="space-y-1">
                        {advice.saran.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-[9px] font-bold text-rose-500">
                              {i + 1}
                            </span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Ringkasan */}
                    {advice.ringkasan && (
                      <p className="rounded-lg border border-border/70 bg-background/60 p-2.5 text-xs italic leading-relaxed text-muted-foreground">
                        💛 {advice.ringkasan}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus curhatan"
        description={`Hapus curhatan tanggal ${deleteTarget?.date}?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
