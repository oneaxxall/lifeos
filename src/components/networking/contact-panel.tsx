"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Handshake, Plus, Trash2, UserCheck } from "lucide-react";
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
import { CONTACT_PRIORITIES } from "@/lib/db/schema";

export interface ContactItem {
  id: number;
  name: string;
  role: string;
  company: string;
  context: string;
  interests: string;
  priority: string;
  lastContact: string;
}

interface Props {
  items: ContactItem[];
  onChanged: () => void;
}

const PRIORITY_META: Record<string, { label: string; className: string }> = {
  penting: { label: "Penting", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  sedang: { label: "Sedang", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  ringan: { label: "Ringan", className: "bg-muted text-muted-foreground" },
};

const DAYS_TO_COLD = 90;

function daysSince(dateStr: string): number | null {
  if (!dateStr) return null;
  return Math.max(0, Math.round((Date.now() - new Date(dateStr + "T00:00:00").getTime()) / 86400000));
}

/** Kontak profesional: catat + konteks + follow-up (NW-01/02/05). */
export function ContactPanel({ items, onChanged }: Props) {
  const [showForm, setShowForm] = React.useState(false);
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [context, setContext] = React.useState("");
  const [interests, setInterests] = React.useState("");
  const [priority, setPriority] = React.useState("sedang");
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ContactItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast.error("Nama kontak kosong");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/networking/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, role, company, context, interests, priority, lastContact: new Date().toISOString().slice(0, 10) }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Kontak "${n}" tersimpan 🤝`);
      setName(""); setRole(""); setCompany(""); setContext(""); setInterests("");
      setPriority("sedang");
      setShowForm(false);
      onChanged();
    } catch {
      toast.error("Gagal menyimpan kontak");
    } finally {
      setSaving(false);
    }
  };

  const markContacted = async (item: ContactItem) => {
    const res = await fetch(`/api/networking/contacts/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastContact: new Date().toISOString().slice(0, 10) }),
    });
    if (res.ok) {
      toast.success(`Sudah dihubungi ✓ — timer ${item.name} di-reset`);
      onChanged();
    } else {
      toast.error("Gagal memperbarui");
    }
  };

  const remove = async (item: ContactItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/networking/contacts/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Kontak dihapus");
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
          <Handshake className="size-4 text-primary" /> Kontak
          <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        </p>
        <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 size-3" /> {showForm ? "Batal" : "Tambah kontak"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 space-y-2 rounded-lg border border-border/60 p-3">
          <Input placeholder="Nama… (mis. Budi Santoso)" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Peran (mis. CTO)" value={role} onChange={(e) => setRole(e.target.value)} className="h-9 text-sm" />
            <Input placeholder="Perusahaan" value={company} onChange={(e) => setCompany(e.target.value)} className="h-9 text-sm" />
          </div>
          <Input placeholder="Konteks kenal (mis. Conference 2025)" value={context} onChange={(e) => setContext(e.target.value)} className="h-9 text-sm" />
          <Input placeholder="Minat/personal (mis. Suka golf, baru punya anak)" value={interests} onChange={(e) => setInterests(e.target.value)} className="h-9 text-sm" />
          <div className="flex gap-2">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-9 flex-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p} className="text-sm">
                    {PRIORITY_META[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => void save()} disabled={saving} size="sm" className="h-9">
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Belum ada kontak — tambahkan relasi pertamamu.
        </p>
      ) : (
        <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const days = daysSince(item.lastContact);
            const isCold = days === null || days > DAYS_TO_COLD;
            const meta = PRIORITY_META[item.priority] ?? PRIORITY_META.sedang;
            return (
              <li
                key={item.id}
                className="group rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-2">
                  <Handshake className="size-3.5 shrink-0 text-primary" />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</p>
                  <Badge className={`shrink-0 text-[9px] ${meta.className}`}>{meta.label}</Badge>
                  {isCold && (
                    <Badge className="shrink-0 bg-amber-500/15 text-[9px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/15">
                      {days === null ? "belum pernah" : `+${days} hari`}
                    </Badge>
                  )}
                </div>

                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {[item.role, item.company].filter(Boolean).join(" · ") || "—"}
                </p>

                <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                  {item.context && <p>📍 {item.context}</p>}
                  {item.interests && <p>💬 {item.interests}</p>}
                  {item.lastContact && (
                    <p className={cn(isCold && "font-medium text-amber-600 dark:text-amber-400")}>
                      🕐 Terakhir kontak: {days !== null ? `${days} hari lalu` : ""} ({format(new Date(item.lastContact), "d MMM yyyy", { locale: id })})
                    </p>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[10px]"
                    onClick={() => void markContacted(item)}
                  >
                    <UserCheck className="size-3" /> Sudah dihubungi
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-6 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`Hapus kontak ${item.name}`}
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
        title="Hapus kontak"
        description={`Hapus kontak "${deleteTarget?.name}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
