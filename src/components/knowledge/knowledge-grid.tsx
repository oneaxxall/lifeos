"use client";

import { LibraryBig } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { KnowledgeCard, type KnowledgeItem } from "@/components/knowledge/knowledge-card";

interface Props {
  items: KnowledgeItem[];
  loading: boolean;
  onPreview: (item: KnowledgeItem) => void;
  onEdit: (item: KnowledgeItem) => void;
  onDelete: (item: KnowledgeItem) => void;
}

/** Grid kartu knowledge + skeleton loading + empty state.
 *  Single responsibility: hanya menampilkan kumpulan kartu. */
export function KnowledgeGrid({ items, loading, onPreview, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="mb-1.5 h-3 w-full" />
            <Skeleton className="mb-1.5 h-3 w-5/6" />
            <Skeleton className="mb-4 h-3 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
          <LibraryBig className="size-7 text-primary/70" />
        </div>
        <div>
          <p className="font-medium">Tidak ada catatan</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Belum ada knowledge yang cocok dengan filter ini. Klik{" "}
            <b>Tambah</b> untuk menangkap ide pertama Anda, atau atur ulang
            filter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <KnowledgeCard
          key={item.id}
          item={item}
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
