"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { SPIRITUAL_RITUALS } from "@/lib/db/schema";
import type { SpiritualEntryItem } from "@/components/spiritual/ritual-form";

interface Props {
  entries: SpiritualEntryItem[];
  onChanged: () => void;
}

const RITUAL_LABEL: Record<string, string> = Object.fromEntries(
  SPIRITUAL_RITUALS.map((r) => [r.key, r.label])
);

/** Riwayat entri ritual harian — detail checklist, kualitas, refleksi (SPI-01). */
export function SpiritualHistory({ entries, onChanged }: Props) {
  const [deleteTarget, setDeleteTarget] = React.useState<SpiritualEntryItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const parseRituals = (raw: string): Record<string, boolean> => {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  const remove = async (entry: SpiritualEntryItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/spiritual/entries/${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Entri ritual dihapus");
      setDeleteTarget(null);
      onChanged();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <CalendarCheck className="size-4 text-indigo-500" /> Riwayat ritual
        <Badge variant="secondary" className="text-[10px]">{entries.length}</Badge>
      </p>

      <ul className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
        {entries.map((entry) => {
          const rituals = parseRituals(entry.rituals);
          const doneList = SPIRITUAL_RITUALS.filter((r) => rituals[r.key]);
          const doneCount = doneList.length;
          return (
            <li
              key={entry.id}
              className="group rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <CalendarCheck className="size-3.5 text-indigo-500" />
                  {format(new Date(entry.date), "EEEE, d MMMM yyyy", { locale: id })}
                </span>
                <span className="ml-auto flex items-center gap-1.5">
                  {entry.quality > 0 && (
                    <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                      kualitas {entry.quality}/5
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
                    onClick={() => setDeleteTarget(entry)}
                    aria-label={`Hapus entri ${entry.date}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </span>
              </div>

              {/* Checklist ritual */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {doneCount === 0 ? (
                  <Badge variant="outline" className="text-[9px] text-muted-foreground">
                    tidak ada ritual dicentang
                  </Badge>
                ) : (
                  doneList.map((r) => (
                    <span
                      key={r.key}
                      className="flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300"
                    >
                      {r.icon} {RITUAL_LABEL[r.key]}
                    </span>
                  ))
                )}
              </div>

              {entry.reflection && (
                <p className="mt-2 border-t border-border/40 pt-1.5 text-xs italic text-muted-foreground">
                  🪞 {entry.reflection}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus entri ritual"
        description={`Hapus entri ritual tanggal ${deleteTarget?.date}?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
