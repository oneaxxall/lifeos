"use client";

import * as React from "react";
import { Layers, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryMenuItem {
  id: number;
  name: string;
  count?: number;
  /** Meta tambahan (warna/ikon, opsional) */
  meta?: {
    color?: string;
    value?: string;
    label?: string;
  };
}

interface Props {
  title: string;
  items: CategoryMenuItem[];
  /** Kategori aktif (id) — null = semua */
  activeId: number | null;
  onSelect: (id: number | null) => void;
  onManage: () => void;
  /** Label tombol kelola (opsional) */
  manageLabel?: string;
}

/** Group menu kategori di dalam halaman fitur — klik untuk filter, badge count, tombol kelola. */
export function CategoryMenu({ title, items, activeId, onSelect, onManage, manageLabel = "Kelola kategori" }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Layers className="size-3.5 text-primary" />
        <p className="text-xs font-semibold">{title}</p>
        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          {items.length}
        </span>
      </div>

      {/* Semua */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
          activeId === null
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <span className="truncate">Semua</span>
        <span className="ml-auto tabular-nums text-[9px] text-muted-foreground">
          {items.reduce((s, i) => s + (i.count ?? 0), 0)}
        </span>
      </button>

      {/* Daftar kategori */}
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onSelect(activeId === item.id ? null : item.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                activeId === item.id
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.meta?.color ?? "#0D9488" }}
              />
              <span className="truncate">{item.name}</span>
              {typeof item.count === "number" && item.count > 0 && (
                <span className="ml-auto tabular-nums text-[9px] text-muted-foreground">{item.count}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <button
        onClick={onManage}
        className="mt-2 flex w-full items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Settings2 className="size-3" /> {manageLabel}
      </button>
    </div>
  );
}
