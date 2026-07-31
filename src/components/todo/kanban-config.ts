import {
  CircleDashed,
  CircleDot,
  CircleDotDashed,
  CircleCheck,
  type LucideIcon,
} from "lucide-react";
import type { TodoStatus } from "@/lib/db/schema";

export interface KanbanColumnConfig {
  status: TodoStatus;
  title: string;
  icon: LucideIcon;
  accent: string; // warna aksen kolom
  dot: string; // warna dot badge
}

/** Konfigurasi 4 kolom kanban — satu sumber kebenaran untuk UI */
export const KANBAN_COLUMNS_CONFIG: KanbanColumnConfig[] = [
  {
    status: "backlog",
    title: "Backlog",
    icon: CircleDashed,
    accent: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  {
    status: "todo",
    title: "To Do",
    icon: CircleDot,
    accent: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  {
    status: "in_progress",
    title: "In Progress",
    icon: CircleDotDashed,
    accent: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  {
    status: "done",
    title: "Done",
    icon: CircleCheck,
    accent: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
];

export function getColumnConfig(status: TodoStatus): KanbanColumnConfig {
  return (
    KANBAN_COLUMNS_CONFIG.find((c) => c.status === status) ??
    KANBAN_COLUMNS_CONFIG[0]
  );
}

export const PRIORITY_META = {
  tinggi: { label: "Tinggi", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" },
  sedang: { label: "Sedang", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  rendah: { label: "Rendah", className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30" },
} as const;

export type Priority = keyof typeof PRIORITY_META;
