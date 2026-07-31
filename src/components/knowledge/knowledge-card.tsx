"use client";

import { CalendarDays, Eye, FolderOpen, Hash, Sparkles, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sanitizeHtml } from "@/lib/sanitize";

export interface KnowledgeItem {
  id: number;
  title: string;
  content: string;
  source: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  categories: { id: number; name: string }[];
  tags: { id: number; name: string }[];
}

interface Props {
  item: KnowledgeItem;
  onPreview: (item: KnowledgeItem) => void;
  onEdit: (item: KnowledgeItem) => void;
  onDelete: (item: KnowledgeItem) => void;
}

/** Satu kartu knowledge — kaya informasi + ikon penegas (rule #2, #8).
 *  Single responsibility: hanya menampilkan satu catatan. */
export function KnowledgeCard({ item, onPreview, onEdit, onDelete }: Props) {
  // Preview teks bersih dari HTML editor
  const plainText = item.content
    ? item.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : "";

  return (
    <article
      onClick={() => onPreview(item)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      {/* Aksen atas — garis teal tipis */}
      <div className="h-1 w-full bg-gradient-to-r from-primary/60 to-primary/10" />

      <div className="flex flex-1 flex-col p-4">
        {/* Header: judul + aksi */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug">
            {item.title}
          </h3>
          <div
            className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(item)}
              aria-label={`Edit ${item.title}`}
            >
              <Eye className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(item)}
              aria-label={`Hapus ${item.title}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Ringkasan AI */}
        {item.summary && (
          <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-primary/5 px-2.5 py-2 text-xs leading-relaxed">
            <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
            <span className="line-clamp-2">{item.summary}</span>
          </p>
        )}

        {/* Konten preview */}
        {plainText && (
          <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            <span
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(plainText.slice(0, 220)),
              }}
            />
          </p>
        )}

        {/* Meta: kategori · tags · tanggal (dengan ikon) */}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/60 pt-2.5">
          {item.categories.length > 0 ? (
            <span className="flex items-center gap-1">
              <FolderOpen className="size-3 text-primary/70" />
              {item.categories.slice(0, 2).map((c) => (
                <Badge
                  key={c.id}
                  variant="secondary"
                  className="text-[10px] capitalize"
                >
                  {c.name}
                </Badge>
              ))}
              {item.categories.length > 2 && (
                <span className="text-[10px] text-muted-foreground">
                  +{item.categories.length - 2}
                </span>
              )}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
              <FolderOpen className="size-3" /> Tanpa kategori
            </span>
          )}

          {item.tags.length > 0 && (
            <span className="flex items-center gap-1">
              <Hash className="size-3 text-muted-foreground" />
              {item.tags.slice(0, 3).map((t) => (
                <span key={t.id} className="text-[11px] text-muted-foreground">
                  #{t.name}
                </span>
              ))}
            </span>
          )}

          <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="size-3" />
            {format(new Date(item.createdAt), "d MMM yyyy", { locale: id })}
          </span>
        </div>
      </div>
    </article>
  );
}
