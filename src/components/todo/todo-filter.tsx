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
import type { Todo, TodoStatus } from "@/lib/db/schema";

export interface TodoFilters {
  query: string;
  priority: string; // "" | "tinggi" | "sedang" | "rendah"
  area: string; // "" | nama area
  due: string; // "" | "terlambat" | "hari_ini" | "minggu_ini" | "tanpa_tanggal"
}

export const DEFAULT_FILTERS: TodoFilters = {
  query: "",
  priority: "",
  area: "",
  due: "",
};

interface Props {
  filters: TodoFilters;
  onChange: (f: TodoFilters) => void;
  /** Semua todos (untuk daftar area unik) */
  allTodos: Todo[];
  /** Hitung berapa kartu yang tersaring (untuk info) */
  visibleCount: number;
  totalCount: number;
}

const PRIORITY_OPTIONS = [
  { value: "tinggi", label: "🔴 Tinggi" },
  { value: "sedang", label: "🟡 Sedang" },
  { value: "rendah", label: "🟢 Rendah" },
];

const DUE_OPTIONS = [
  { value: "terlambat", label: "⚠️ Terlambat" },
  { value: "hari_ini", label: "📌 Hari ini" },
  { value: "minggu_ini", label: "🗓️ 7 hari ke depan" },
  { value: "tanpa_tanggal", label: "🚫 Tanpa tanggal" },
];

/** Toolbar filter Todo — pencarian, prioritas, area, jatuh tempo (TDO-07). */
export function TodoFilterBar({ filters, onChange, allTodos, visibleCount, totalCount }: Props) {
  // Area unik dari todos (urutkan, kosongkan)
  const areas = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of allTodos) {
      if (t.area) set.add(t.area);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allTodos]);

  const hasFilter = filters.query !== "" || filters.priority !== "" || filters.area !== "" || filters.due !== "";

  const set = (patch: Partial<TodoFilters>) => onChange({ ...filters, ...patch });

  const clear = () => onChange({ ...DEFAULT_FILTERS });

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        {/* Pencarian */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari tugas… (judul, deskripsi)"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            className="h-9 pl-8 text-sm"
            aria-label="Cari tugas"
          />
        </div>

        {/* Prioritas */}
        <Select value={filters.priority} onValueChange={(v) => set({ priority: v })}>
          <SelectTrigger className="h-9 w-full lg:w-36" aria-label="Filter prioritas">
            <SelectValue placeholder="Prioritas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua prioritas</SelectItem>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Area */}
        <Select value={filters.area} onValueChange={(v) => set({ area: v })}>
          <SelectTrigger className="h-9 w-full lg:w-36" aria-label="Filter area">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua area</SelectItem>
            {areas.length === 0 && <SelectItem value="__none__" disabled>Belum ada area</SelectItem>}
            {areas.map((a) => (
              <SelectItem key={a} value={a} className="capitalize">
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Jatuh tempo */}
        <Select value={filters.due} onValueChange={(v) => set({ due: v })}>
          <SelectTrigger className="h-9 w-full lg:w-44" aria-label="Filter jatuh tempo">
            <SelectValue placeholder="Jatuh tempo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua tanggal</SelectItem>
            {DUE_OPTIONS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
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
            {visibleCount}/{totalCount} tugas
          </span>
        </div>
      </div>
    </div>
  );
}

/** Aplikasikan filter ke daftar todos — dipakai kanban-board. */
export function applyTodoFilters(todos: Todo[], filters: TodoFilters): Todo[] {
  const q = filters.query.trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  // Batas 7 hari ke depan
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);

  return todos.filter((t) => {
    // Pencarian teks
    if (q) {
      const hay = `${t.title} ${t.description ?? ""} ${t.area ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    // Prioritas
    if (filters.priority && t.priority !== filters.priority) return false;
    // Area
    if (filters.area && t.area !== filters.area) return false;
    // Jatuh tempo
    if (filters.due) {
      const due = t.dueDate || "";
      switch (filters.due) {
        case "terlambat":
          if (!due || due >= today) return false;
          break;
        case "hari_ini":
          if (due !== today) return false;
          break;
        case "minggu_ini":
          if (!due || due < today || due > in7Str) return false;
          break;
        case "tanpa_tanggal":
          if (due !== "") return false;
          break;
      }
    }
    return true;
  });
}

export type { TodoStatus };
