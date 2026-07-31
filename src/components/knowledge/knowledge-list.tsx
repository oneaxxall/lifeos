"use client";

import * as React from "react";
import { toast } from "sonner";
import { KnowledgeFilters, type KnowledgeFilterState } from "@/components/knowledge/knowledge-filters";
import { KnowledgeGrid } from "@/components/knowledge/knowledge-grid";
import { KnowledgePreviewDialog } from "@/components/knowledge/knowledge-preview-dialog";
import { KnowledgeEditorDialog } from "@/components/knowledge/knowledge-editor-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CategoryMenu, type CategoryMenuItem } from "@/components/ui/category-menu";
import { CategoryManagerDialog } from "@/components/ui/category-manager-dialog";
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
  const [categoryItems, setCategoryItems] = React.useState<CategoryMenuItem[]>([]);
  const [manageOpen, setManageOpen] = React.useState(false);

  const loadCategories = React.useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/categories");
      const json = await res.json();
      setCategoryItems(json.data ?? []);
    } catch {
      /* dropdown tetap jalan dari labels */
    }
  }, []);

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
      fetch("/api/knowledge/categories").then((r) => r.json()),
    ])
      .then(([listJson, labelsJson, catJson]) => {
        if (cancelled) return;
        setItems(listJson.data ?? []);
        setAllCategories(
          labelsJson.data.categories.map((c: { name: string }) => c.name)
        );
        setAllTags(labelsJson.data.tags.map((t: { name: string }) => t.name));
        setCategoryItems(catJson.data ?? []);
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

  // Kategori aktif dari filter (nama → id)
  const activeCategoryId =
    categoryItems.find((c) => c.name === filters.category)?.id ?? null;

  const onSelectCategory = (id: number | null) => {
    const name = id === null ? "" : categoryItems.find((c) => c.id === id)?.name ?? "";
    onFiltersChange({ ...filters, category: name });
  };

  const onCategoryChanged = () => {
    void loadCategories();
    // Refresh opsi dropdown labels juga
    fetch("/api/knowledge/labels")
      .then((r) => r.json())
      .then((json) => {
        setAllCategories(json.data.categories.map((c: { name: string }) => c.name));
      })
      .catch(() => {});
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        {/* Group menu kategori */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <CategoryMenu
            title="Kategori Knowledge"
            items={categoryItems}
            activeId={activeCategoryId}
            onSelect={onSelectCategory}
            onManage={() => setManageOpen(true)}
          />
        </aside>

        {/* Konten utama */}
        <div className="min-w-0 space-y-5">
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
        </div>
      </div>

      <CategoryManagerDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        title="Kelola kategori Knowledge"
        baseUrl="/api/knowledge/categories"
        items={categoryItems}
        onChanged={onCategoryChanged}
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
