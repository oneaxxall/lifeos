"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Briefcase, CalendarClock, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PROJECT_STAGES } from "@/lib/db/schema";

export interface ProjectItem {
  id: number;
  name: string;
  stage: string;
  target: string;
  deadline: string;
  active: boolean;
}

interface Props {
  items: ProjectItem[];
  onChanged: () => void;
}

const STAGE_META: Record<string, { label: string; className: string }> = {
  riset: { label: "Riset", className: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  mvp: { label: "MVP", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  luncur: { label: "Luncur", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  tumbuh: { label: "Tumbuh", className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
};

/** Proyek bisnis: tahap, target, deadline (BIZ-02). */
export function ProjectPanel({ items, onChanged }: Props) {
  const [showForm, setShowForm] = React.useState(false);
  const [name, setName] = React.useState("");
  const [stage, setStage] = React.useState("riset");
  const [target, setTarget] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ProjectItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast.error("Nama proyek kosong");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/business/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, stage, target: target.trim(), deadline }),
      });
      if (!res.ok) throw new Error();
      toast.success("Proyek dibuat 🚀");
      setName("");
      setTarget("");
      setDeadline("");
      setShowForm(false);
      onChanged();
    } catch {
      toast.error("Gagal membuat proyek");
    } finally {
      setSaving(false);
    }
  };

  const advanceStage = async (item: ProjectItem) => {
    const idx = PROJECT_STAGES.indexOf(item.stage as never);
    if (idx < 0 || idx >= PROJECT_STAGES.length - 1) return;
    const next = PROJECT_STAGES[idx + 1];
    const res = await fetch(`/api/business/projects/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next }),
    });
    if (res.ok) {
      toast.success(`"${item.name}" → tahap ${STAGE_META[next].label}`);
      onChanged();
    }
  };

  const toggleActive = async (item: ProjectItem) => {
    const res = await fetch(`/api/business/projects/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    if (res.ok) {
      toast.success(item.active ? "Proyek di-pause" : "Proyek diaktifkan kembali");
      onChanged();
    }
  };

  const remove = async (item: ProjectItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/business/projects/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Proyek dihapus");
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
      <div className="mb-3 flex items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Briefcase className="size-4 text-primary" /> Proyek bisnis
          <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        </p>
        <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 size-3" /> {showForm ? "Batal" : "Buat proyek"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 space-y-2 rounded-lg border border-border/60 p-3">
          <Input placeholder="Nama proyek… (mis. LifeOS Pro)" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STAGES.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">
                    {STAGE_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Target (mis. 100 user)" value={target} onChange={(e) => setTarget(e.target.value)} className="h-9 text-sm" />
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={saving} size="sm" className="h-8">
              {saving ? "Membuat…" : "Buat proyek"}
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Belum ada proyek — buat untuk mulai melacak progres.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const stageMeta = STAGE_META[item.stage] ?? STAGE_META.riset;
            const isLastStage = item.stage === PROJECT_STAGES[PROJECT_STAGES.length - 1];
            return (
              <li
                key={item.id}
                className={cn(
                  "group rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40",
                  !item.active && "opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="size-3.5 shrink-0 text-primary" />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</p>
                  <Badge className={`shrink-0 text-[9px] ${stageMeta.className}`}>{stageMeta.label}</Badge>
                  {!item.active && <Badge variant="outline" className="shrink-0 text-[9px]">paused</Badge>}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  {item.target && <span className="flex items-center gap-1">🎯 {item.target}</span>}
                  {item.deadline && (
                    <span className="flex items-center gap-1">
                      <CalendarClock className="size-3" /> {format(new Date(item.deadline), "d MMM yyyy", { locale: id })}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => void advanceStage(item)}
                    disabled={isLastStage}
                  >
                    Majukan tahap <ChevronRight className="ml-0.5 size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] text-muted-foreground"
                    onClick={() => void toggleActive(item)}
                  >
                    {item.active ? "Pause" : "Aktifkan"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-6 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`Hapus proyek ${item.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus proyek"
        description={`Hapus proyek "${deleteTarget?.name}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
