"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { BookHeart, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
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

/** Riwayat curhatan keluarga + ringkasan nasihat AI. */
export function FamilyList({ items, onChanged }: Props) {
  const [deleteTarget, setDeleteTarget] = React.useState<FamilyItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

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

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <BookHeart className="size-4 text-rose-500" /> Riwayat curhat
        <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
      </p>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Belum ada curhatan — ruang ini selalu terbuka untukmu. 💛
        </p>
      ) : (
        <ul className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const advice = parseAdvice(item.aiAdvice);
            return (
              <li
                key={item.id}
                className="group rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-2">
                  <Users className="size-3.5 shrink-0 text-rose-500" />
                  <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
                    {item.content}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`Hapus curhatan ${item.date}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {format(new Date(item.date), "d MMMM yyyy", { locale: id })}
                  {item.people && <span> · {item.people}</span>}
                  {item.mood && <span> · {item.mood}</span>}
                </p>

                {advice && (
                  <p className="mt-1.5 line-clamp-2 rounded-md bg-rose-500/5 px-2.5 py-1.5 text-xs text-muted-foreground">
                    🫂 {advice.empati}
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
