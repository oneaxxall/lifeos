"use client";

import * as React from "react";
import { Plus, Trash2, UsersRound } from "lucide-react";
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

export interface TeamMemberItem {
  id: number;
  name: string;
  role: string;
  seniority: string;
  strengths: string;
}

interface Props {
  items: TeamMemberItem[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onChanged: () => void;
}

const SENIORITY_META: Record<string, { label: string; className: string }> = {
  junior: { label: "Junior", className: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  mid: { label: "Mid", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  senior: { label: "Senior", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  lead: { label: "Lead", className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
};

/** Anggota tim & peran (TE-01). */
export function TeamMemberPanel({ items, selectedId, onSelect, onChanged }: Props) {
  const [showForm, setShowForm] = React.useState(false);
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [seniority, setSeniority] = React.useState("mid");
  const [strengths, setStrengths] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TeamMemberItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast.error("Nama anggota kosong");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, role, seniority, strengths: strengths.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Anggota "${n}" ditambahkan 👥`);
      setName(""); setRole(""); setStrengths("");
      setShowForm(false);
      onChanged();
    } catch {
      toast.error("Gagal menyimpan anggota");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: TeamMemberItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/team/members/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Anggota dihapus");
      if (selectedId === item.id) onSelect(null);
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
          <UsersRound className="size-4 text-primary" /> Anggota tim
          <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        </p>
        <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 size-3" /> {showForm ? "Batal" : "Tambah"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 space-y-2 rounded-lg border border-border/60 p-3">
          <Input placeholder="Nama… (mis. Rina Wijaya)" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Peran (mis. Frontend Engineer)" value={role} onChange={(e) => setRole(e.target.value)} className="h-9 text-sm" />
            <Select value={seniority} onValueChange={setSeniority}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SENIORITY_META).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-sm">
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Kekuatan / area fokus (opsional)" value={strengths} onChange={(e) => setStrengths(e.target.value)} className="h-9 text-sm" />
          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={saving} size="sm" className="h-8">
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Belum ada anggota — tambahkan tim pertamamu.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const meta = SENIORITY_META[item.seniority] ?? SENIORITY_META.mid;
            const active = selectedId === item.id;
            return (
              <li
                key={item.id}
                className={`group flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                  active ? "border-primary/50 bg-primary/5" : "border-border/60 hover:bg-muted/40"
                }`}
              >
                <button className="min-w-0 flex-1 text-left" onClick={() => onSelect(active ? null : item.id)}>
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.role || "—"}
                    {item.strengths && <span> · 💪 {item.strengths}</span>}
                  </p>
                </button>
                <Badge className={`shrink-0 text-[9px] ${meta.className}`}>{meta.label}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(item)}
                  aria-label={`Hapus anggota ${item.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus anggota"
        description={`Hapus anggota "${deleteTarget?.name}"? Riwayat 1-on-1 mereka tetap tersimpan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
