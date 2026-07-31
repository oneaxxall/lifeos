"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Flame,
  Lightbulb,
  Loader2,
  Radar,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HabitInsightPanel } from "@/components/habits/habit-insight-panel";
import type { HabitInsight } from "@/lib/ai/habit-insight";

export interface HabitItem {
  id: number;
  name: string;
  category: string;
  targetText: string | null;
  alasan: string | null;
  weeklyTarget: number | null;
  active: boolean;
  createdAt: string;
  todayLog: { id: number; status: string; jumlahKambuh: number; catatan: string } | null;
  /** Hasil analisa AI tersimpan (JSON string) — ditampilkan langsung di kartu */
  lastAnalysis: string | null;
  lastAnalysisSource: string | null;
  lastAnalyzedAt: string | null;
}

export interface HabitStatsData {
  streak: number;
  longestStreak: number;
  totalBersih: number;
  totalKambuh: number;
  last7: ("" | "bersih" | "kambuh")[];
  kambuhMingguIni: number;
}

interface Props {
  habit: HabitItem;
  stats: HabitStatsData;
  onChanged: () => void;
  /** Mengubah refreshKey agar panel AI ikut refresh saat data habit berubah */
  refreshKey: number;
}

const CATEGORY_META: Record<string, { label: string; className: string; dot: string }> = {
  digital: { label: "Digital", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
  konsumsi: { label: "Konsumsi", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  fisik: { label: "Fisik", className: "bg-rose-500/15 text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
  lainnya: { label: "Lainnya", className: "bg-slate-500/15 text-slate-600 dark:text-slate-400", dot: "bg-slate-500" },
};

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** Kartu kebiasaan — streak + progress mingguan + kalender + check-in (BH-02/03). */
export function HabitCard({ habit, stats, onChanged, refreshKey }: Props) {
  const [checking, setChecking] = React.useState<"bersih" | "kambuh" | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [aiOpen, setAiOpen] = React.useState(false);

  const meta = CATEGORY_META[habit.category] ?? CATEGORY_META.lainnya;
  const doneToday = habit.todayLog?.status === "bersih";
  const relapsedToday = habit.todayLog?.status === "kambuh";

  // Hasil analisa tersimpan (dari DB) — tampil tanpa perlu klik
  const storedAdvice = React.useMemo(() => {
    if (!habit.lastAnalysis) return null;
    try {
      return JSON.parse(habit.lastAnalysis) as HabitInsight;
    } catch {
      return null;
    }
  }, [habit.lastAnalysis]);
  const analyzedDate = habit.lastAnalyzedAt
    ? new Date(habit.lastAnalyzedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const checkin = async (status: "bersih" | "kambuh") => {
    setChecking(status);
    try {
      const res = await fetch("/api/habits/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: habit.id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success(status === "bersih" ? "Hari ini bersih — mantap! 🎉" : "Kambuh itu manusiawi — besok mulai lagi 💪");
      onChanged();
    } catch {
      toast.error("Gagal menyimpan check-in");
    } finally {
      setChecking(null);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/habits/${habit.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Kebiasaan dihapus");
      setDeleteTarget(false);
      onChanged();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  // Progress mingguan: kambuh vs target
  const target = habit.weeklyTarget ?? 0;
  const progressPct = target > 0 ? Math.min(100, Math.round((stats.kambuhMingguIni / target) * 100)) : null;

  // Hari ini (untuk label kalender)
  const todayIndex = (new Date().getDay() + 6) % 7; // Senin=0 … Minggu=6

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm transition-colors",
        doneToday ? "border-emerald-500/30" : relapsedToday ? "border-rose-500/30" : "border-border"
      )}
    >
      {/* ===== Header: nama + kategori + status hari ini ===== */}
      <div className="p-4 pb-0">
        <div className="flex items-start gap-3">
          {/* Status dot */}
          <div
            className={cn(
              "mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg",
              doneToday
                ? "bg-emerald-500/15 text-emerald-500"
                : relapsedToday
                  ? "bg-rose-500/15 text-rose-500"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {doneToday ? (
              <Check className="size-4.5" />
            ) : relapsedToday ? (
              <X className="size-4.5" />
            ) : (
              <Flame className="size-4.5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold leading-tight">{habit.name}</p>
              <Badge className={cn("shrink-0 text-[9px]", meta.className)}>{meta.label}</Badge>
            </div>

            {/* Status hari ini — jelas */}
            <p className="mt-0.5 text-[11px] font-medium">
              {doneToday ? (
                <span className="text-emerald-600 dark:text-emerald-400">✓ Sudah check-in: hari ini bersih</span>
              ) : relapsedToday ? (
                <span className="text-rose-600 dark:text-rose-400">✗ Hari ini kambuh — besok mulai lagi</span>
              ) : (
                <span className="text-muted-foreground">Belum check-in hari ini</span>
              )}
            </p>
          </div>

          {/* Aksi */}
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-7",
                aiOpen ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
              onClick={() => setAiOpen((a) => !a)}
              aria-label={aiOpen ? "Sembunyikan analisa AI" : "Analisa dengan AI"}
              title="Analisa AI kebiasaan ini"
            >
              <Radar className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? "Sembunyikan detail" : "Lihat detail"}
              aria-expanded={expanded}
            >
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteTarget(true)}
              aria-label={`Hapus kebiasaan ${habit.name}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Panel analisa AI per kebiasaan */}
      {aiOpen && (
        <div className="mt-3 px-4">
          <HabitInsightPanel habitId={habit.id} refreshKey={refreshKey} onAnalyzed={onChanged} />
        </div>
      )}

      {/* ===== Ringkasan stats (selalu tampil) ===== */}
      <div className="mt-3 grid grid-cols-3 divide-x divide-border/60 border-y border-border/50 bg-muted/20">
        <div className="flex flex-col items-center gap-0.5 px-2 py-2.5">
          <div className="flex items-center gap-1">
            <Flame className={cn("size-3.5", stats.streak > 0 ? "text-amber-500" : "text-muted-foreground/40")} />
            <span className="text-lg font-bold leading-none">{stats.streak}</span>
          </div>
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">hari bersih</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 px-2 py-2.5">
          <span className={cn("text-lg font-bold leading-none", stats.kambuhMingguIni > 0 ? "text-rose-500" : "text-emerald-500")}>
            {stats.kambuhMingguIni}
          </span>
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">kambuh mgg ini</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 px-2 py-2.5">
          <span className="text-lg font-bold leading-none">{stats.longestStreak}</span>
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">rekor terbaik</span>
        </div>
      </div>

      {/* Hasil analisa AI TERSIMPAN — tampil langsung dari DB (tanpa klik) */}
      {storedAdvice && !aiOpen && (
        <div className="mx-4 mt-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-3">
          <div className="flex items-center gap-1.5">
            <Radar className="size-3.5 text-primary" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              Analisa AI tersimpan
            </p>
            {habit.lastAnalysisSource === "heuristik" && (
              <Badge variant="outline" className="ml-auto text-[9px]">
                offline
              </Badge>
            )}
            {analyzedDate && (
              <span className="ml-auto text-[9px] text-muted-foreground">{analyzedDate}</span>
            )}
          </div>

          {/* Pesan penyemangat */}
          {storedAdvice.pesan && (
            <p className="mt-1.5 text-xs leading-relaxed font-medium">{storedAdvice.pesan}</p>
          )}

          {/* Pola pemicu */}
          {storedAdvice.pemicu.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                <Radar className="size-3" /> Pola pemicu
              </p>
              {storedAdvice.pemicu.map((p, i) => (
                <div key={i} className="text-[11px] leading-relaxed">
                  <p className="font-medium">{p.pola}</p>
                  <p className="text-muted-foreground">
                    {p.konteks} <span className="text-foreground">{p.saran}</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Saran pengganti */}
          {storedAdvice.pengganti.length > 0 && (
            <div className="mt-2.5 space-y-1">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                <Lightbulb className="size-3" /> Saran pengganti
              </p>
              {storedAdvice.pengganti.map((g, i) => (
                <p key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="mt-0.5 shrink-0 text-primary/70">✨</span>
                  <span>
                    <span className="font-medium text-foreground">{g.pemicu}:</span> {g.gantiDengan}
                  </span>
                </p>
              ))}
            </div>
          )}

          {/* Refleksi */}
          {storedAdvice.refleksi && (
            <p className="mt-2.5 rounded-md bg-background/50 px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {storedAdvice.refleksi}
            </p>
          )}
        </div>
      )}

      {/* ===== Detail (collapsible) ===== */}
      {expanded && (
        <div className="space-y-3 border-b border-border/50 px-4 py-3">
          {/* Target & alasan */}
          {(habit.targetText || habit.alasan) && (
            <div className="space-y-1.5 rounded-lg bg-background/60 p-3">
              {habit.targetText && (
                <p className="flex items-start gap-2 text-xs">
                  <Target className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>
                    <span className="font-medium">Target:</span> {habit.targetText}
                  </span>
                </p>
              )}
              {habit.alasan && (
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-0.5 shrink-0">💭</span>
                  <span>
                    <span className="font-medium text-foreground">Alasan:</span> {habit.alasan}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Progress mingguan */}
          {target > 0 && progressPct !== null && (
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px]">
                <span className="font-medium text-muted-foreground">
                  Progress minggu ini: {stats.kambuhMingguIni}/{target} kambuh
                </span>
                <span className={cn("font-bold", progressPct >= 100 ? "text-rose-500" : "text-emerald-500")}>
                  {progressPct >= 100 ? "melebihi target!" : "aman ✓"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    progressPct >= 100 ? "bg-rose-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Kalender 7 hari */}
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              7 hari terakhir
            </p>
            <div className="flex items-center gap-1.5">
              {stats.last7.map((s, i) => {
                const dayOfWeek = (todayIndex - (6 - i) + 14) % 7;
                const isToday = i === 6;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className={cn("text-[9px]", isToday ? "font-bold text-foreground" : "text-muted-foreground")}>
                      {DAY_LABELS[dayOfWeek]}
                    </span>
                    <div
                      className={cn(
                        "flex h-8 w-full items-center justify-center rounded-lg border text-xs font-semibold",
                        s === "bersih"
                          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : s === "kambuh"
                            ? "border-rose-500/50 bg-rose-500/20 text-rose-600 dark:text-rose-400"
                            : "border-dashed border-border/70 bg-muted/20 text-muted-foreground/50",
                        isToday && "ring-1 ring-primary/50"
                      )}
                    >
                      {s === "bersih" ? "✓" : s === "kambuh" ? "✗" : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== Check-in 5 detik ===== */}
      <div className="grid grid-cols-2 gap-2 p-4">
        <Button
          variant={doneToday ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-10 gap-1.5 text-sm",
            !doneToday &&
              "border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-500 dark:text-emerald-400"
          )}
          disabled={checking !== null || doneToday}
          onClick={() => void checkin("bersih")}
        >
          {checking === "bersih" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : doneToday ? (
            <Check className="size-4" />
          ) : (
            <Check className="size-4" />
          )}
          {doneToday ? "Hari ini bersih" : "Bersih"}
        </Button>
        <Button
          variant={relapsedToday ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-10 gap-1.5 text-sm",
            !relapsedToday &&
              "border-rose-500/50 text-rose-600 hover:bg-rose-500/10 hover:text-rose-500 dark:text-rose-400"
          )}
          disabled={checking !== null || relapsedToday}
          onClick={() => void checkin("kambuh")}
        >
          {checking === "kambuh" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : relapsedToday ? (
            <X className="size-4" />
          ) : (
            <X className="size-4" />
          )}
          {relapsedToday ? "Sudah kambuh" : "Kambuh"}
        </Button>
      </div>

      <ConfirmDialog
        open={deleteTarget}
        onOpenChange={setDeleteTarget}
        title="Hapus kebiasaan?"
        description={`"${habit.name}" beserta riwayat check-in-nya akan dihapus permanen.`}
        confirmLabel={deleting ? "Menghapus…" : "Ya, hapus"}
        destructive
        busy={deleting}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
