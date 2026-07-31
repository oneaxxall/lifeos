"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarHeart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { MOOD_OPTIONS } from "@/components/mental/mood-form";

export interface MoodItem {
  id: number;
  date: string;
  mood: number;
  note: string;
}

interface Props {
  moods: MoodItem[];
  onChanged: () => void;
}

/** Tren mood (chart area) + riwayat mood dengan emoji (MEN-03). */
export function MoodTrends({ moods, onChanged }: Props) {
  const [deleteTarget, setDeleteTarget] = React.useState<MoodItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const remove = async (m: MoodItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/mental/moods/${m.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Entri mood dihapus");
      setDeleteTarget(null);
      onChanged();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const chartData = [...moods].reverse().map((m) => ({
    tanggal: m.date.slice(5),
    Mood: m.mood,
  }));

  const avg = moods.length
    ? (moods.reduce((s, m) => s + m.mood, 0) / moods.length).toFixed(1)
    : "0";

  const emojiFor = (v: number) => MOOD_OPTIONS.find((m) => m.value === v)?.emoji ?? "😐";

  return (
    <div className="space-y-4">
      {/* Chart area */}
      {moods.length >= 2 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <CalendarHeart className="size-4 text-violet-600 dark:text-violet-400" />
            Tren mood
            <Badge variant="secondary" className="text-[10px]">
              rata-rata {avg}/5
            </Badge>
          </p>
          <div className="h-[200px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" className="min-w-0">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -25 }}>
                <defs>
                  <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 10 }} tickLine={false} domain={["dataMin", "dataMax"]} />
                <YAxis domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="Mood" stroke="#8B5CF6" strokeWidth={2} fill="url(#moodGradient)" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Riwayat mood */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <CalendarHeart className="size-4 text-violet-600 dark:text-violet-400" />
          Riwayat mood
          <Badge variant="secondary" className="text-[10px]">{moods.length}</Badge>
        </p>

        {moods.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Belum ada mood dicatat — ketuk emoji di atas!
          </p>
        ) : (
          <ul className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
            {moods.map((m) => (
              <li
                key={m.id}
                className="group flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <span className="text-lg">{emojiFor(m.mood)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {format(new Date(m.date), "EEEE, d MMMM yyyy", { locale: id })}
                  </p>
                  {m.note && (
                    <p className="truncate text-xs text-muted-foreground">{m.note}</p>
                  )}
                </div>
                <span className="text-sm font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                  {m.mood}/5
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={() => setDeleteTarget(m)}
                  aria-label={`Hapus mood ${m.date}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus entri mood"
        description={`Hapus mood ${emojiFor(deleteTarget?.mood ?? 0)} tanggal ${deleteTarget?.date}?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
