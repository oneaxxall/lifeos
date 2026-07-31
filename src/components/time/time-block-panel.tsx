"use client";

import * as React from "react";
import { CalendarRange, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

export interface TimeBlockItem {
  id: number;
  title: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  day: string;
  startTime: string;
  endTime: string;
}

interface Props {
  blocks: TimeBlockItem[];
  categories: { id: number; name: string; color: string }[];
  onChanged: () => void;
}

/** Time block — jadwal blok waktu per hari, ditampilkan sebagai timeline (TIM-04). */
export function TimeBlockPanel({ blocks, categories, onChanged }: Props) {
  const [showForm, setShowForm] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("10:00");
  const [deleteTarget, setDeleteTarget] = React.useState<TimeBlockItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const add = async () => {
    if (!title.trim() || !startTime || !endTime) {
      toast.error("Judul & jam wajib diisi");
      return;
    }
    if (endTime <= startTime) {
      toast.error("Jam selesai harus setelah jam mulai");
      return;
    }
    try {
      const res = await fetch("/api/time/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          categoryId: categoryId ? Number(categoryId) : null,
          day: new Date().toISOString().slice(0, 10),
          startTime,
          endTime,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Time block disimpan");
      setTitle("");
      setShowForm(false);
      onChanged();
    } catch {
      toast.error("Gagal menyimpan time block");
    }
  };

  const remove = async (b: TimeBlockItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/time/blocks/${b.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Time block dihapus");
      setDeleteTarget(null);
      onChanged();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  // Urutkan blok & hitung posisi untuk timeline
  const sorted = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CalendarRange className="size-4 text-primary" /> Time block hari ini
          <Badge variant="secondary" className="text-[10px]">{blocks.length}</Badge>
        </p>
        <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-3.5" /> Tambah blok
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 flex flex-wrap gap-2 rounded-lg bg-muted/40 p-2">
          <Input
            placeholder="Judul blok (mis. Deep work)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 w-44 text-xs"
            autoFocus
          />
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Kategori (opsional)" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)} className="text-xs capitalize">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-8 w-28 text-xs" />
          <span className="self-center text-xs text-muted-foreground">→</span>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-8 w-28 text-xs" />
          <Button size="sm" className="h-8 text-xs" onClick={() => void add()}>
            Simpan
          </Button>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Belum ada time block — rencanakan hari dengan blok waktu!
        </p>
      ) : (
        <div className="relative space-y-1 pl-4">
          {/* Garis timeline */}
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />
          {sorted.map((b) => (
            <div key={b.id} className="group relative flex items-center gap-3 rounded-lg py-1.5">
              <span
                className="absolute -left-4 size-3 rounded-full border-2 border-background"
                style={{ background: b.categoryColor || "#0D9488" }}
              />
              <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {b.startTime}–{b.endTime}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{b.title}</p>
                {b.categoryName && (
                  <p className="text-[10px] capitalize text-muted-foreground">{b.categoryName}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
                onClick={() => setDeleteTarget(b)}
                aria-label={`Hapus blok ${b.title}`}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus time block"
        description={`Hapus blok "${deleteTarget?.title}" (${deleteTarget?.startTime}–${deleteTarget?.endTime})?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
