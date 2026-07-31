"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Bed, CalendarDays, Dumbbell, Footprints, GlassWater, NotepadText, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import type { HealthEntryItem } from "@/components/health/health-trends";

interface Props {
  entries: HealthEntryItem[];
  onChanged: () => void;
}

function Metric({ icon, value, suffix }: { icon: React.ReactNode; value: number | null; suffix: string }) {
  if (!value) return null;
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {icon}
      <span className="font-medium tabular-nums text-foreground">{value}</span>
      {suffix}
    </span>
  );
}

/** Daftar entri kesehatan harian — semua metrik + catatan (HLT-01). */
export function HealthEntryList({ entries, onChanged }: Props) {
  const [deleteTarget, setDeleteTarget] = React.useState<HealthEntryItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const remove = async (entry: HealthEntryItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/health/entries/${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Entri dihapus");
      setDeleteTarget(null);
      onChanged();
    } catch {
      toast.error("Gagal menghapus entri");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <NotepadText className="size-4 text-emerald-600 dark:text-emerald-400" />
        Riwayat kesehatan
        <Badge variant="secondary" className="text-[10px]">{entries.length}</Badge>
      </p>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Belum ada data — catat kesehatan hari ini di form atas!
        </p>
      ) : (
        <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {entries.map((e) => (
            <li
              key={e.id}
              className="group rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <CalendarDays className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  {format(new Date(e.date), "EEEE, d MMMM yyyy", { locale: id })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-7 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={() => setDeleteTarget(e)}
                  aria-label={`Hapus entri ${e.date}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <Metric icon={<Scale className="size-3" />} value={e.weightKg} suffix="kg" />
                <Metric icon={<Bed className="size-3" />} value={e.sleepHours} suffix="jam" />
                <Metric icon={<Dumbbell className="size-3" />} value={e.exerciseMinutes} suffix="menit" />
                <Metric icon={<Footprints className="size-3" />} value={e.steps} suffix="langkah" />
                <Metric icon={<GlassWater className="size-3" />} value={e.waterGlasses} suffix="gelas" />
              </div>

              {e.notes && (
                <p className="mt-1.5 border-t border-border/40 pt-1.5 text-xs italic text-muted-foreground">
                  {e.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus entri kesehatan"
        description={`Hapus entri ${deleteTarget?.date}?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
