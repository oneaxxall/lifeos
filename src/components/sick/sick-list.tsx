"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronDown, ChevronRight, History, Stethoscope, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

/** Riwayat catatan tidak enak badan — dengan saran AI lengkap (collapsible). */
export function SickList({ items, onChanged }: Props) {
  const [deleteTarget, setDeleteTarget] = React.useState<SickItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [openId, setOpenId] = React.useState<number | null>(null);

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
        <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
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
                    <Stethoscope className="size-3.5 shrink-0 text-rose-500" />
                    <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
                      {item.symptoms}
                    </p>
                    {item.needsProfessional && (
                      <Badge className="shrink-0 bg-amber-500/15 text-[9px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/15">
                        ⚠️ periksa
                      </Badge>
                    )}
                    {advice && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-muted-foreground hover:text-rose-500"
                        onClick={() => setOpenId(open ? null : item.id)}
                        aria-label={open ? "Sembunyikan saran AI" : "Lihat saran AI"}
                      >
                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </Button>
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
                    {item.notes && <span> · {item.notes}</span>}
                  </p>

                  {/* Ringkasan singkat saat tertutup */}
                  {advice && !open && (
                    <button
                      onClick={() => setOpenId(item.id)}
                      className="mt-1.5 block w-full text-left rounded-md bg-rose-500/5 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-rose-500/10"
                    >
                      💡 {advice.ringkasan}
                    </button>
                  )}
                </div>

                {/* Saran AI lengkap */}
                {advice && open && (
                  <div className="space-y-2.5 border-t border-rose-500/20 px-3 pb-3 pt-2.5">
                    {advice.needsProfessional && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5">
                        <span className="text-base">⚠️</span>
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
