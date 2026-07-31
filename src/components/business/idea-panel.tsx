"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CheckCircle2, Lightbulb, PauseCircle, Plus, Rocket, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

export interface IdeaItem {
  id: number;
  title: string;
  description: string;
  status: "baru" | "dieksekusi" | "berhenti";
  createdAt: string;
}

interface Props {
  items: IdeaItem[];
  onChanged: () => void;
  onExecute: (idea: IdeaItem) => void;
}

const STATUS_META: Record<IdeaItem["status"], { label: string; className: string }> = {
  baru: { label: "Baru", className: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  dieksekusi: { label: "Dieksekusi", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  berhenti: { label: "Berhenti", className: "bg-muted text-muted-foreground" },
};

/** Ide bisnis: tangkap cepat + status (BIZ-01). */
export function IdeaPanel({ items, onChanged, onExecute }: Props) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<IdeaItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const save = async () => {
    const t = title.trim();
    if (!t) {
      toast.error("Tulis dulu ide bisnismu");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/business/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, description: description.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ide tersimpan 💡");
      setTitle("");
      setDescription("");
      onChanged();
    } catch {
      toast.error("Gagal menyimpan ide");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (item: IdeaItem, status: IdeaItem["status"]) => {
    const res = await fetch(`/api/business/ideas/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Status: ${STATUS_META[status].label}`);
      onChanged();
    }
  };

  const remove = async (item: IdeaItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/business/ideas/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Ide dihapus");
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
        <Lightbulb className="size-4 text-amber-500" /> Ide bisnis
        <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
      </p>

      {/* Input cepat */}
      <div className="flex gap-2">
        <Input
          placeholder="Ide baru… (mis. aplikasi habit tracker untuk tim)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void save()}
          className="h-9 text-sm"
        />
        <Button onClick={() => void save()} disabled={saving} size="icon" className="size-9 shrink-0" aria-label="Simpan ide">
          <Plus className="size-4" />
        </Button>
      </div>
      <Input
        placeholder="Potensi / deskripsi singkat (opsional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mt-2 h-9 text-sm"
      />

      {/* Daftar ide */}
      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="group flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {item.description || "—"} · {format(new Date(item.createdAt), "d MMM yyyy", { locale: id })}
                </p>
              </div>

              <Badge className={`shrink-0 text-[9px] ${STATUS_META[item.status].className}`}>
                {STATUS_META[item.status].label}
              </Badge>

              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-primary hover:text-primary/70"
                onClick={() => onExecute(item)}
                title="Rencana eksekusi 30 hari"
                aria-label={`Rencana 30 hari untuk ${item.title}`}
              >
                <Rocket className="size-3.5" />
              </Button>

              {item.status !== "dieksekusi" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 text-emerald-600 hover:text-emerald-500"
                  onClick={() => void updateStatus(item, "dieksekusi")}
                  title="Tandai dieksekusi"
                  aria-label={`Tandai ${item.title} dieksekusi`}
                >
                  <CheckCircle2 className="size-3.5" />
                </Button>
              )}
              {item.status !== "berhenti" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 text-muted-foreground hover:text-muted-foreground/70"
                  onClick={() => void updateStatus(item, "berhenti")}
                  title="Tandai berhenti"
                  aria-label={`Tandai ${item.title} berhenti`}
                >
                  <PauseCircle className="size-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteTarget(item)}
                aria-label={`Hapus ide ${item.title}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus ide"
        description={`Hapus ide "${deleteTarget?.title}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
