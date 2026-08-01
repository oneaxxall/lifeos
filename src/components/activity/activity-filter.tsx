"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActivityItem } from "@/components/time/activity-list";

export interface ActivityFilters {
  query: string;
  categoryId: string; // "" = semua | number string
  value: string; // "" | "produktif" | "netral" | "buang"
}

export const DEFAULT_ACTIVITY_FILTERS: ActivityFilters = {
  query: "",
  categoryId: "",
  value: "",
};

interface Props {
  filters: ActivityFilters;
  onChange: (f: ActivityFilters) => void;
  categories: { id: number; name: string; color: string }[];
  visibleCount: number;
  totalCount: number;
}

const VALUE_OPTIONS = [
  { value: "produktif", label: "💪 Produktif" },
  { value: "netral", label: "➖ Netral" },
  { value: "buang", label: "🗑️ Buang" },
];

/** Toolbar filter riwayat Activity — pencarian, kategori, nilai. */
export function ActivityFilterBar({
  filters,
  onChange,
  categories,
  visibleCount,
  totalCount,
}: Props) {
  const hasFilter = filters.query !== "" || filters.categoryId !== "" || filters.value !== "";

  const set = (patch: Partial<ActivityFilters>) => onChange({ ...filters, ...patch });
  const clear = () => onChange({ ...DEFAULT_ACTIVITY_FILTERS });

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        {/* Pencarian */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari aktivitas… (nama, deskripsi, tag)"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            className="h-9 pl-8 text-sm"
            aria-label="Cari aktivitas"
          />
        </div>

        {/* Kategori */}
        <Select value={filters.categoryId} onValueChange={(v) => set({ categoryId: v })}>
          <SelectTrigger className="h-9 w-full lg:w-36" aria-label="Filter kategori">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua kategori</SelectItem>
            {categories.length === 0 && (
              <SelectItem value="__none__" disabled>
                Belum ada kategori
              </SelectItem>
            )}
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)} className="capitalize">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Nilai */}
        <Select value={filters.value} onValueChange={(v) => set({ value: v })}>
          <SelectTrigger className="h-9 w-full lg:w-36" aria-label="Filter nilai">
            <SelectValue placeholder="Nilai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua nilai</SelectItem>
            {VALUE_OPTIONS.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Info + reset */}
        <div className="flex items-center gap-2">
          {hasFilter && (
            <button
              onClick={clear}
              className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Reset filter"
            >
              <X className="size-3.5" /> Reset
            </button>
          )}
          <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2.5 text-[11px] text-muted-foreground">
            <SlidersHorizontal className="size-3" />
            {visibleCount}/{totalCount} aktivitas
          </span>
        </div>
      </div>
    </div>
  );
}

/** Aplikasikan filter ke daftar aktivitas. */
export function applyActivityFilters(
  activities: ActivityItem[],
  filters: ActivityFilters
): ActivityItem[] {
  const q = filters.query.trim().toLowerCase();

  return activities.filter((a) => {
    // Pencarian teks: nama + deskripsi + tags
    if (q) {
      let tagsText = "";
      try {
        const arr = JSON.parse(a.tags ?? "[]");
        tagsText = Array.isArray(arr) ? arr.join(" ") : "";
      } catch {
        tagsText = "";
      }
      const hay = `${a.name} ${a.description ?? ""} ${tagsText}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    // Kategori
    if (filters.categoryId && a.categoryId !== Number(filters.categoryId)) return false;
    // Nilai
    if (filters.value && a.categoryValue !== filters.value) return false;
    return true;
  });
}
