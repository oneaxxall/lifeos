"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarDays, FolderOpen, Hash, Pencil, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sanitizeHtml } from "@/lib/sanitize";
import { QuillContent } from "@/components/ui/rich-text-editor";
import type { KnowledgeItem } from "@/components/knowledge/knowledge-card";

interface Props {
  item: KnowledgeItem | null;
  onClose: () => void;
  onEdit: (item: KnowledgeItem) => void;
}

/** Preview knowledge — tampilan bersih: meta di atas, konten terformat, aksi di bawah. */
export function KnowledgePreviewDialog({ item, onClose, onEdit }: Props) {
  if (!item) return null;

  const tags = (item.tags || []).map((t) => t.name);
  const categories = item.categories || [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      {/* showCloseButton=false — pakai tombol X custom di header (hindari dobel) */}
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        {/* ── Header ── */}
        <DialogHeader className="border-b border-border px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-2xl font-semibold leading-snug">
              {item.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-2 -mt-1 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </Button>
          </div>

          {/* Meta bar */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {categories.length > 0 && (
              <span className="flex items-center gap-1.5">
                <FolderOpen className="size-3.5" />
                {categories.map((c) => (
                  <Badge
                    key={c.id}
                    variant="secondary"
                    className="text-[10px] capitalize"
                  >
                    {c.name}
                  </Badge>
                ))}
              </span>
            )}
            {tags.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Hash className="size-3.5" />
                {tags.map((t) => (
                  <span key={t} className="text-muted-foreground">
                    #{t}
                  </span>
                ))}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {format(new Date(item.createdAt), "d MMMM yyyy", { locale: id })}
            </span>
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {item.summary && (
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  Ringkasan AI
                </p>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {item.summary}
                </p>
              </div>
            </div>
          )}

          {item.content ? (
            <div className="prose-lifeos">
              <QuillContent html={sanitizeHtml(item.content)} />
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              (Tidak ada konten)
            </p>
          )}
        </div>

        {/* ── Footer aksi ── */}
        <Separator />
        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={() => onEdit(item)}>
            <Pencil className="size-4" /> Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
