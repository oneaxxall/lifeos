"use client";

import * as React from "react";
import {
  ArrowDownWideNarrow,
  FolderOpen,
  Hash,
  RotateCcw,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface KnowledgeFilterState {
  q: string;
  category: string; // "" = semua
  tag: string; // "" = semua
  sort: "terbaru" | "terlama";
}

interface Props {
  value: KnowledgeFilterState;
  onChange: (next: KnowledgeFilterState) => void;
  /** Opsi dropdown (dari relasi many-to-many) */
  categories: string[];
  tags: string[];
}

/** Filter bar Knowledge — dropdown kategori/tag (relasi many-to-many),
 *  search, dan sort. Single responsibility: hanya urusan filter. */
export function KnowledgeFilters({ value, onChange, categories, tags }: Props) {
  const set = (patch: Partial<KnowledgeFilterState>) =>
    onChange({ ...value, ...patch });

  const hasActiveFilter =
    value.q || value.category || value.tag || value.sort !== "terbaru";

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari judul atau isi…"
          className="pl-9"
          value={value.q}
          onChange={(e) => set({ q: e.target.value })}
        />
      </div>

      {/* Dropdown kategori (relasi many-to-many → dropdown, rule #6) */}
      <Select
        value={value.category || "all"}
        onValueChange={(v) => set({ category: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <span className="flex items-center gap-2">
            <FolderOpen className="size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Semua kategori" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua kategori</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c} className="capitalize">
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Dropdown tags */}
      <Select
        value={value.tag || "all"}
        onValueChange={(v) => set({ tag: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <span className="flex items-center gap-2">
            <Hash className="size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Semua tag" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua tag</SelectItem>
          {tags.map((t) => (
            <SelectItem key={t} value={t}>
              #{t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={value.sort}
        onValueChange={(v) => set({ sort: v as "terbaru" | "terlama" })}
      >
        <SelectTrigger className="w-full sm:w-[150px]">
          <span className="flex items-center gap-2">
            <ArrowDownWideNarrow className="size-3.5 text-muted-foreground" />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="terbaru">Terbaru dulu</SelectItem>
          <SelectItem value="terlama">Terlama dulu</SelectItem>
        </SelectContent>
      </Select>

      {/* Reset filter */}
      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            onChange({ q: "", category: "", tag: "", sort: "terbaru" })
          }
          aria-label="Reset filter"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-4" />
        </Button>
      )}
    </div>
  );
}
