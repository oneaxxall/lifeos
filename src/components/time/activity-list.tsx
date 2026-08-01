"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { History, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: number;
  name: string;
  description: string | null;
  tags: string | null;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  categoryId: number | null;
  categoryName: string | null;
  categoryValue: "produktif" | "netral" | "buang" | null;
  categoryColor: string | null;
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function formatDur(menit: number): string {
  const h = Math.floor(menit / 60);
  const m = menit % 60;
  if (h === 0) return `${m} menit`;
  return m ? `${h}j ${m}m` : `${h} jam`;
}

const VALUE_META = {
  produktif: { label: "Produktif", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  netral: { label: "Netral", className: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  buang: { label: "Buang", className: "bg-destructive/10 text-destructive" },
} as const;

interface Props {
  activities: ActivityItem[];
  /** Filter kategori dari menu samping (null = semua) */
  menuCategoryId?: number | null;
  onChanged: () => void;
}

/** Daftar aktivitas terakhir — riwayat + deskripsi + tags + durasi (TIM-01/03). */
export function ActivityList({ activities, menuCategoryId = null, onChanged }: Props) {
  const [deleteTarget, setDeleteTarget] = React.useState<ActivityItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const filtered = menuCategoryId === null
    ? activities
    : activities.filter((a) => a.categoryId === menuCategoryId);

  const remove = async (a: ActivityItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/time/activities/${a.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Aktivitas dihapus");
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
        <History className="size-4 text-primary" /> Riwayat aktivitas
        <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>
      </p>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {activities.length === 0
            ? "Belum ada aktivitas — catat aktivitas di form sebelah kiri!"
            : "Tidak ada aktivitas di kategori ini."}
        </p>
      ) : (
        <ul className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
          {filtered.map((a) => {
            const tags = parseTags(a.tags);
            return (
              <li
                key={a.id}
                className="group rounded-lg border border-border/60 px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: a.categoryColor || "#0D9488" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(a.startedAt), "d MMM, HH:mm", { locale: id })}
                      {a.categoryName && <span className="capitalize"> · {a.categoryName}</span>}
                    </p>
                  </div>
                  {a.categoryValue && (
                    <Badge
                      variant="outline"
                      className={`px-1.5 py-0 text-[9px] ${VALUE_META[a.categoryValue].className}`}
                    >
                      {VALUE_META[a.categoryValue].label}
                    </Badge>
                  )}
                  <span className="text-sm font-semibold tabular-nums">
                    {formatDur(a.durationMinutes)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
                    onClick={() => setDeleteTarget(a)}
                    aria-label={`Hapus ${a.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                {/* Deskripsi */}
                {a.description && (
                  <p className="mt-1 pl-5 text-xs leading-relaxed text-muted-foreground">
                    {a.description}
                  </p>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-1 pl-5">
                    <Tags className="size-3 text-muted-foreground/50" />
                    {tags.map((t) => (
                      <span
                        key={t}
                        className={cn(
                          "rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        )}
                      >
                        #{t}
                      </span>
                    ))}
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
        title="Hapus aktivitas"
        description={`Hapus "${deleteTarget?.name}" dari riwayat?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}

