"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { History, Stethoscope, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
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

/** Riwayat catatan tidak enak badan. */
export function SickList({ items, onChanged }: Props) {
  const [deleteTarget, setDeleteTarget] = React.useState<SickItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

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

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <History className="size-4 text-rose-500" /> Riwayat tidak enak badan
        <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
      </p>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Belum ada catatan — semoga tidak perlu! 💪
        </p>
      ) : (
        <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const advice = parseAdvice(item.aiAdvice);
            return (
              <li
                key={item.id}
                className="group rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-2">
                  <Stethoscope className="size-3.5 shrink-0 text-rose-500" />
                  <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
                    {item.symptoms}
                  </p>
                  {item.needsProfessional && (
                    <Badge className="shrink-0 bg-amber-500/15 text-[9px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/15">
                      ⚠️ periksa
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`Hapus catatan ${item.date}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {format(new Date(item.date), "d MMMM yyyy", { locale: id })}
                  {item.duration && <span> · {item.duration}</span>}
                </p>

                {advice && (
                  <p className="mt-1.5 line-clamp-2 rounded-md bg-rose-500/5 px-2.5 py-1.5 text-xs text-muted-foreground">
                    💡 {advice.ringkasan}
                  </p>
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
