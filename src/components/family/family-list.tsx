"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { BookHeart, ChevronDown, ChevronRight, Compass, Heart, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

/** Riwayat curhatan keluarga + nasihat AI lengkap (collapsible). */
export function FamilyList({ items, onChanged }: Props) {
  const [deleteTarget, setDeleteTarget] = React.useState<FamilyItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [openId, setOpenId] = React.useState<number | null>(null);

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
        <ul className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const advice = parseAdvice(item.aiAdvice);
            const open = openId === item.id;
            return (
              <li
                key={item.id}
                className={cn(
                  "rounded-lg border transition-colors",
                  open ? "border-rose-500/30 bg-rose-500/[0.03]" : "border-border/60 hover:bg-muted/40"
                )}
              >
                {/* Baris ringkas */}
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <Users className="size-3.5 shrink-0 text-rose-500" />
                    <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
                      {item.content}
                    </p>
                    {advice && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-muted-foreground hover:text-rose-500"
                        onClick={() => setOpenId(open ? null : item.id)}
                        aria-label={open ? "Sembunyikan nasihat AI" : "Lihat nasihat AI"}
                      >
                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </Button>
                    )}
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

                  {/* Empati singkat saat tertutup */}
                  {advice && !open && (
                    <button
                      onClick={() => setOpenId(item.id)}
                      className="mt-1.5 block w-full text-left rounded-md bg-rose-500/5 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-rose-500/10"
                    >
                      🫂 {advice.empati}
                    </button>
                  )}
                </div>

                {/* Nasihat AI lengkap */}
                {advice && open && (
                  <div className="space-y-2.5 border-t border-rose-500/20 px-3 pb-3 pt-2.5">
                    {/* Empati */}
                    <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5">
                      <Heart className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                      <p className="text-xs leading-relaxed font-medium">{advice.empati}</p>
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
