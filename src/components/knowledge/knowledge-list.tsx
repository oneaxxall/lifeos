"use client";

import * as React from "react";
import { toast } from "sonner";
import { KnowledgeFilters, type KnowledgeFilterState } from "@/components/knowledge/knowledge-filters";
import { KnowledgeGrid } from "@/components/knowledge/knowledge-grid";
import { KnowledgePreviewDialog } from "@/components/knowledge/knowledge-preview-dialog";
import { KnowledgeEditorDialog } from "@/components/knowledge/knowledge-editor-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { KnowledgeItem } from "@/components/knowledge/knowledge-card";

const DEFAULT_FILTERS: KnowledgeFilterState = {
  q: "",
  category: "",
  tag: "",
  sort: "terbaru",
};

/** Orchestrator halaman Knowledge — kelola state, fetch data, compose komponen.
 *  Single responsibility: hanya koordinasi; tampilan di komponen terpisah. */
export function KnowledgeList() {
  const [items, setItems] = React.useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<KnowledgeFilterState>(DEFAULT_FILTERS);
  const [allCategories, setAllCategories] = React.useState<string[]>([]);
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const [previewItem, setPreviewItem] = React.useState<KnowledgeItem | null>(null);
  const [editingItem, setEditingItem] = React.useState<KnowledgeItem | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<KnowledgeItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async (f: KnowledgeFilterState) => {
    try {
      const params = new URLSearchParams();
      if (f.q) params.set("q", f.q);
      if (f.category) params.set("category", f.category);
      if (f.tag) params.set("tag", f.tag);
      if (f.sort !== "terbaru") params.set("sort", f.sort);
      const res = await fetch(`/api/knowledge?${params.toString()}`);
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast.error("Gagal memuat knowledge");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal: data + daftar kategori/tag untuk dropdown
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/knowledge").then((r) => r.json()),
      fetch("/api/knowledge/labels").then((r) => r.json()),
    ])
      .then(([listJson, labelsJson]) => {
        if (cancelled) return;
        setItems(listJson.data ?? []);
        setAllCategories(
          labelsJson.data.categories.map((c: { name: string }) => c.name)
        );
        setAllTags(labelsJson.data.tags.map((t: { name: string }) => t.name));
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat knowledge");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch ulang saat filter berubah (debounce singkat untuk q)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFiltersChange = (next: KnowledgeFilterState) => {
    setFilters(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      void load(next);
    }, next.q ? 300 : 0);
  };

  const remove = async (item: KnowledgeItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/knowledge/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Catatan dihapus");
      setDeleteTarget(null);
      // Muat ulang + refresh opsi dropdown
      void load(filters);
      fetch("/api/knowledge/labels")
        .then((r) => r.json())
        .then((json) => {
          setAllCategories(
            json.data.categories.map((c: { name: string }) => c.name)
          );
          setAllTags(json.data.tags.map((t: { name: string }) => t.name));
        })
        .catch(() => {});
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (item: KnowledgeItem) => {
    setPreviewItem(null);
    setEditingItem(item);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-5">
      <KnowledgeFilters
        value={filters}
        onChange={onFiltersChange}
        categories={allCategories}
        tags={allTags}
      />

      <KnowledgeGrid
        items={items}
        loading={loading}
        onPreview={setPreviewItem}
        onEdit={openEdit}
        onDelete={(item) => setDeleteTarget(item)}
      />

      <KnowledgePreviewDialog
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onEdit={openEdit}
      />

      <KnowledgeEditorDialog
        key={editingItem ? `edit-${editingItem.id}` : `create-${editorOpen}`}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        item={editingItem}
        onSaved={() => {
          setEditingItem(null);
          void load(filters);
        }}
      />

      {/* Konfirmasi hapus knowledge (shadcn AlertDialog — pengganti window.confirm) */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus catatan"
        description={`Hapus "${deleteTarget?.title}"?\n\nCatatan dan relasinya (kategori & tag) akan ikut terhapus.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
