"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { CategoryMenuItem } from "@/components/ui/category-menu";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Endpoint CRUD kategori (tanpa trailing slash) — mis. "/api/finance/categories" */
  baseUrl: string;
  items: CategoryMenuItem[];
  onChanged: () => void;
}

/** Dialog manajemen kategori — tambah, rename, hapus (reusable untuk semua fitur). */
export function CategoryManagerDialog({ open, onOpenChange, title, baseUrl, items, onChanged }: Props) {
  const [newName, setNewName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [editName, setEditName] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<CategoryMenuItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const add = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Tulis nama kategori");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Kategori "${name}" ditambahkan`);
      setNewName("");
      onChanged();
    } catch {
      toast.error("Gagal menambah (mungkin sudah ada)");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: CategoryMenuItem) => {
    setEditId(item.id);
    setEditName(item.name);
  };

  const saveEdit = async () => {
    const name = editName.trim();
    if (!name || !editId) return;
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      toast.success("Kategori diperbarui");
      setEditId(null);
      onChanged();
    } catch {
      toast.error("Gagal memperbarui kategori");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: CategoryMenuItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`${baseUrl}/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`Kategori "${item.name}" dihapus`);
      setDeleteTarget(null);
      onChanged();
    } catch {
      toast.error("Gagal menghapus kategori");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Pencil className="size-5 text-primary" /> {title}
          </DialogTitle>
        </DialogHeader>

        {/* Tambah baru */}
        <div className="flex gap-2">
          <Input
            placeholder="Nama kategori baru…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void add()}
            className="h-9 text-sm"
          />
          <Button onClick={() => void add()} disabled={saving} size="icon" className="size-9 shrink-0" aria-label="Tambah kategori">
            <Plus className="size-4" />
          </Button>
        </div>

        {/* Daftar + edit/hapus */}
        <ul className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
              {editId === item.id ? (
                <>
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void saveEdit()}
                    className="h-8 text-sm"
                  />
                  <Button onClick={() => void saveEdit()} disabled={saving} size="sm" className="h-8 shrink-0">
                    Simpan
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 shrink-0" onClick={() => setEditId(null)}>
                    Batal
                  </Button>
                </>
              ) : (
                <>
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.meta?.color ?? "#0D9488" }}
                  />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</p>
                  {typeof item.count === "number" && (
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] tabular-nums text-muted-foreground">
                      {item.count}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-primary"
                    onClick={() => startEdit(item)}
                    aria-label={`Edit kategori ${item.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`Hapus kategori ${item.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>

        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title="Hapus kategori"
          description={`Hapus kategori "${deleteTarget?.name}"? Item yang memakai kategori ini tidak terhapus, hanya lepas dari kategori.`}
          confirmLabel="Hapus"
          cancelLabel="Batal"
          destructive
          busy={deleting}
          onConfirm={() => deleteTarget && void remove(deleteTarget)}
        />
      </DialogContent>
    </Dialog>
  );
}
