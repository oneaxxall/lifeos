"use client";

import * as React from "react";
import { ListTodo, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Todo, TodoStatus } from "@/lib/db/schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ada isinya = edit; kosong = buat */
  todo?: Todo | null;
  defaultStatus?: TodoStatus;
  onSaved?: () => void;
}

/** Dialog tambah/edit tugas — form lengkap dengan prioritas, due date, estimasi. */
export function TaskDialog({ open, onOpenChange, todo, defaultStatus, onSaved }: Props) {
  const isEdit = Boolean(todo);
  const [title, setTitle] = React.useState(todo?.title ?? "");
  const [description, setDescription] = React.useState(todo?.description ?? "");
  const [priority, setPriority] = React.useState(todo?.priority ?? "sedang");
  const [dueDate, setDueDate] = React.useState(todo?.dueDate ?? "");
  const [estimateMinutes, setEstimateMinutes] = React.useState(
    todo?.estimateMinutes ? String(todo.estimateMinutes) : ""
  );
  const [area, setArea] = React.useState(todo?.area ?? "");
  const [status, setStatus] = React.useState<TodoStatus>(
    todo?.status ?? defaultStatus ?? "backlog"
  );
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    const t = title.trim();
    if (!t) {
      toast.error("Judul tugas wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/todos/${todo!.id}` : "/api/todos", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          description,
          priority,
          dueDate,
          estimateMinutes: Number(estimateMinutes) || 0,
          area,
          status,
        }),
      });
      if (!res.ok) throw new Error("Gagal");
      toast.success(isEdit ? "Perubahan disimpan ✨" : "Tugas ditambahkan ✨");
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isEdit ? (
              <>
                <Pencil className="size-4 text-primary" /> Edit tugas
              </>
            ) : (
              <>
                <ListTodo className="size-4 text-primary" /> Tugas baru
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="todo-title">Judul</Label>
            <Input
              id="todo-title"
              placeholder="Apa yang perlu dilakukan?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="todo-desc">Deskripsi</Label>
            <Textarea
              id="todo-desc"
              placeholder="Detail tugas (opsional)…"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioritas</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as "tinggi" | "sedang" | "rendah")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tinggi">🟥 Tinggi</SelectItem>
                  <SelectItem value="sedang">🟨 Sedang</SelectItem>
                  <SelectItem value="rendah">🟦 Rendah</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="todo-due">Tenggat</Label>
              <Input
                id="todo-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="todo-est">Estimasi (menit)</Label>
              <Input
                id="todo-est"
                type="number"
                min={0}
                placeholder="mis. 90"
                value={estimateMinutes}
                onChange={(e) => setEstimateMinutes(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="todo-area">Area hidup</Label>
              <Input
                id="todo-area"
                placeholder="kerja, keluarga…"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Kolom</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TodoStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Menyimpan…" : isEdit ? "Simpan perubahan" : "Tambahkan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
