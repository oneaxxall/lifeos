"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  History,
  Search,
  Stethoscope,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SickAdvice } from "@/lib/ai/sick-advice";

export interface SickItem {
  id: number;
  symptoms: string;
  duration: string;
  notes: string;
  aiAdvice: string;
  needsProfessional: boolean;
  date: string;
}

interface Props {
  items: SickItem[];
  onChanged: () => void;
}

/** Riwayat tidak enak badan — tampilan CARD grid + filter lengkap + saran AI. */
export function SickList({ items, onChanged }: Props) {
  const [deleteTarget, setDeleteTarget] = React.useState<SickItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [openId, setOpenId] = React.useState<number | null>(null);

  // ── Filter state ──
  const [query, setQuery] = React.useState("");
  const [checkFilter, setCheckFilter] = React.useState("all");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"desc" | "asc">("desc");

  const parseAdvice = (raw: string): SickAdvice | null => {
    try {
      return JSON.parse(raw) as SickAdvice;
    } catch {
      return null;
    }
  };

  const remove = async (item: SickItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sick/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Catatan dihapus");
      setDeleteTarget(null);
      onChanged();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  // ── Opsi filter dari data ──
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
      if (q) {
        const hay = `${it.symptoms} ${it.notes} ${it.duration}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (checkFilter === "ya" && !it.needsProfessional) return false;
      if (checkFilter === "tidak" && it.needsProfessional) return false;
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
  }, [items, query, checkFilter, monthFilter, sortBy]);

  const needCheckCount = items.filter((i) => i.needsProfessional).length;
  const filteredCount = filtered.length;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* ── Header + statistik ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4 text-rose-500" /> Riwayat tidak enak badan
          <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="rounded-full bg-muted/50 px-2 py-0.5">
            Total <b className="text-foreground/70">{items.length}</b>
          </span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
            ⚠️ Perlu periksa <b>{needCheckCount}</b>
          </span>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari gejala / catatan…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <select
          value={checkFilter}
          onChange={(e) => setCheckFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="Filter perlu periksa"
        >
          <option value="all">🩺 Semua status</option>
          <option value="ya">⚠️ Perlu periksa</option>
          <option value="tidak">💚 Tidak</option>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[11px] text-muted-foreground"
            onClick={() => {
              setQuery("");
              setCheckFilter("all");
              setMonthFilter("all");
            }}
          >
            Reset
          </Button>
        )}
      </div>

      <p className="mb-2 text-[11px] text-muted-foreground">
        Menampilkan <b className="text-foreground">{filteredCount}</b> dari {items.length} catatan
      </p>

      {/* ── Grid card ── */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {items.length === 0
            ? "Belum ada catatan — semoga tidak perlu! 💪"
            : "Tidak ada catatan yang cocok dengan filter. 🔍"}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {filtered.map((item) => {
            const advice = parseAdvice(item.aiAdvice);
            const open = openId === item.id;
            return (
              <li
                key={item.id}
                className={cn(
                  "group flex flex-col overflow-hidden rounded-xl border transition-colors",
                  open
                    ? "border-rose-500/30 bg-rose-500/[0.03]"
                    : "border-border/60 hover:border-rose-500/20 hover:bg-muted/20"
                )}
              >
                {/* Header card: tanggal + status + aksi */}
                <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {format(new Date(item.date), "d MMMM yyyy", { locale: id })}
                  </p>
                  <div className="flex items-center gap-1">
                    {item.needsProfessional && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                        ⚠️ perlu periksa
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      onClick={() => setDeleteTarget(item)}
                      aria-label={`Hapus catatan ${item.date}`}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>

                {/* Isi card */}
                <div className="flex-1 px-3 py-2.5">
                  <p className={cn("flex items-start gap-1.5 text-[13px] font-medium leading-relaxed", !open && "line-clamp-3")}>
                    <Stethoscope className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                    <span className="min-w-0 break-words">{item.symptoms}</span>
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                    {item.duration && (
                      <span className="rounded-full bg-muted/60 px-1.5 py-0.5">⏱ {item.duration}</span>
                    )}
                    {item.notes && (
                      <span className="rounded-full bg-muted/60 px-1.5 py-0.5">📝 {item.notes}</span>
                    )}
                  </div>

                  {/* Ringkasan singkat saat tertutup */}
                  {advice && !open && (
                    <button
                      onClick={() => setOpenId(item.id)}
                      className="mt-2 block w-full rounded-md bg-rose-500/5 px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-rose-500/10"
                    >
                      💡 {advice.ringkasan}
                    </button>
                  )}
                </div>

                {/* Footer: buka saran AI */}
                {advice ? (
                  <button
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-3 py-1.5 text-[11px] font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
                  >
                    <span className="flex items-center gap-1">
                      <Stethoscope className="size-3" /> {open ? "Sembunyikan saran AI" : "Lihat saran AI"}
                    </span>
                    {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                ) : (
                  <div className="border-t border-border/50 px-3 py-1.5 text-[10px] text-muted-foreground/60">
                    Tanpa saran AI (mode offline)
                  </div>
                )}

                {/* Saran AI lengkap */}
                {advice && open && (
                  <div className="space-y-2 border-t border-rose-500/20 bg-rose-500/[0.02] px-3 pb-3 pt-2.5">
                    {advice.needsProfessional && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          {advice.ringkasan}
                        </p>
                      </div>
                    )}

                    <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-rose-500">
                        Analisa
                      </p>
                      <p className="text-xs leading-relaxed">{advice.analisa}</p>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-rose-500">
                        💡 Saran perawatan mandiri
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

                    <p className="text-[10px] leading-relaxed text-muted-foreground/70">
                      ⚠️ Analisa ini dihasilkan AI sebagai dukungan umum dan <b>bukan diagnosis medis</b>.
                      Jika gejala berlanjut atau memburuk dalam 2-3 hari, konsultasikan ke tenaga medis.
                    </p>
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
        title="Hapus catatan"
        description={`Hapus catatan "${deleteTarget?.symptoms.slice(0, 50)}…"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
