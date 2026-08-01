"use client";

import * as React from "react";
import {
  ArrowDownUp,
  Bookmark,
  Briefcase,
  Layers,
  Loader2,
  PencilLine,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface StockPlanItem {
  id: number;
  code: string;
  type: "avgdown" | "rightissue" | "lotfee";
  input: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const TYPE_META = {
  avgdown: { label: "Avg Down", icon: ArrowDownUp, className: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  rightissue: { label: "Right Issue", icon: Layers, className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  lotfee: { label: "Lot & Fee", icon: Briefcase, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
} as const;

interface Props {
  /** Jenis rencana yang sedang aktif di kalkulator */
  activeType: StockPlanItem["type"];
  onLoad: (plan: StockPlanItem) => void;
  /** Ambil input+hasil state kalkulator saat ini (untuk disimpan) */
  getSnapshot: () => { input: Record<string, unknown>; result: Record<string, unknown> };
}

/** Manajer rencana tersimpan — simpan (dengan kode saham), daftar, muat, hapus. */
export function StockPlansPanel({ activeType, onLoad, getSnapshot }: Props) {
  const [plans, setPlans] = React.useState<StockPlanItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<StockPlanItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stocks/plans");
        const json = await res.json();
        if (!cancelled) setPlans(json.data ?? []);
      } catch {
        // biarkan kosong
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const save = async () => {
    const c = code.trim().toUpperCase();
    if (!c) {
      toast.error("Isi kode saham dulu (mis. BBRI)");
      return;
    }
    setSaving(true);
    try {
      const snap = getSnapshot();
      const res = await fetch("/api/stocks/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, type: activeType, input: snap.input, result: snap.result, notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success(`Rencana ${c} tersimpan 💾`);
      setCode("");
      setNotes("");
      setSaveOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (plan: StockPlanItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/stocks/plans/${plan.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`Rencana ${plan.code} dihapus`);
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = plans.filter((p) => p.type === activeType);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Bookmark className="size-4 text-amber-500" /> Rencana tersimpan
          <span className="text-[10px] font-normal text-muted-foreground">({filtered.length})</span>
        </p>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setSaveOpen(true)}>
          <Save className="size-3.5" /> Simpan rencana
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Memuat…
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Belum ada rencana tersimpan. Klik &quot;Simpan rencana&quot; untuk menyimpan posisi saat ini dengan
          kode saham.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((p) => {
            const meta = TYPE_META[p.type];
            const summary = summarize(p);
            return (
              <li
                key={p.id}
                className="group flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 transition-colors hover:bg-muted/30"
              >
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold",
                    meta.className
                  )}
                >
                  <meta.icon className="size-3" /> {p.code}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {summary.title}
                    {p.notes && <span className="text-muted-foreground"> — {p.notes}</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{summary.detail}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-primary"
                  onClick={() => onLoad(p)}
                  aria-label={`Muat rencana ${p.code}`}
                  title="Muat ke kalkulator"
                >
                  <PencilLine className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(p)}
                  aria-label={`Hapus ${p.code}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Dialog simpan */}
      {saveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSaveOpen(false)}>
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Simpan rencana ({TYPE_META[activeType].label})</p>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setSaveOpen(false)} aria-label="Tutup">
                <X className="size-4" />
              </Button>
            </div>
            <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
              Kode saham (ticker)
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="mis. BBRI, TLKM, GOTO"
              className="mb-3 h-9 text-sm uppercase"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && void save()}
            />
            <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
              Catatan (opsional)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="mis. Target avg down jika turun ke 4000"
              className="mb-4 h-9 text-sm"
            />
            <Button onClick={() => void save()} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus rencana"
        description={`Hapus rencana ${deleteTarget?.code} (${deleteTarget ? TYPE_META[deleteTarget.type].label : ""})?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}

/** Ringkasan singkat hasil untuk ditampilkan di list. */
function summarize(p: StockPlanItem): { title: string; detail: string } {
  const r = p.result as Record<string, unknown> | null;
  const i = p.input as Record<string, unknown> | null;
  if (p.type === "avgdown") {
    return {
      title: "Avg down",
      detail:
        r && r.avgCost
          ? `Avg ${fmtRp(Number(r.avgCost))} · ${i?.sharesOld ?? 0} + ${i?.sharesNew ?? 0} lembar`
          : "Belum ada hasil",
    };
  }
  if (p.type === "rightissue") {
    return {
      title: "Right issue",
      detail:
        r && r.rights
          ? `Hak ${r.rights} lbr · TERP ${fmtRp(Number(r.terp))}`
          : "Belum ada hasil",
    };
  }
  return {
    title: "Lot & fee",
    detail: r && r.netProfit ? `Laba ${fmtRp(Number(r.netProfit))}` : "Belum ada hasil",
  };
}

function fmtRp(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}
