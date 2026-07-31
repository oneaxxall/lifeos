"use client";

import {
  CalendarDays,
  Clock,
  GripVertical,
  GitBranch,
  Pencil,
  Split,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRIORITY_META, type Priority } from "@/components/todo/kanban-config";
import { isBigTask } from "@/lib/ai/breakdown-config";
import type { Todo } from "@/lib/db/schema";

interface Props {
  todo: Todo & { parentTitle?: string | null };
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onBreakdown?: (todo: Todo) => void;
}

function formatMinutes(min: number): string {
  if (!min) return "";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}j ${m}m` : `${h}j`;
}

/** Satu kartu tugas di kanban — drag & drop + info lengkap (rule #2, #8). */
export function TaskCard({ todo, onEdit, onDelete, onBreakdown }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const priority = PRIORITY_META[(todo.priority as Priority) ?? "sedang"];
  const isDone = todo.status === "done";
  const isOverdue =
    !!todo.dueDate &&
    !isDone &&
    new Date(todo.dueDate + "T23:59:59") < new Date();

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`group cursor-grab touch-none rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${
        isDragging ? "z-10 opacity-60 ring-2 ring-primary" : ""
      } ${isDone ? "border-border/50" : "border-border"}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-1">
            <p
              className={`text-sm font-medium leading-snug ${
                isDone ? "text-muted-foreground line-through" : ""
              }`}
            >
              {todo.title}
            </p>
            <div
              className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              {onBreakdown && isBigTask(todo.estimateMinutes) && !isDone && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-primary/80 hover:text-primary"
                  onClick={() => onBreakdown(todo)}
                  aria-label={`Pecah ${todo.title} dengan AI`}
                  title="Pecah jadi sub-langkah (AI)"
                >
                  <Split className="size-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(todo)}
                aria-label={`Edit ${todo.title}`}
              >
                <Pencil className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(todo)}
                aria-label={`Hapus ${todo.title}`}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </div>

          {/* Badge sub-tugas: menunjukkan induknya */}
          {todo.parentTitle && (
            <p className="flex items-center gap-1 text-[10px] text-primary/80">
              <GitBranch className="size-3 shrink-0" />
              <span className="truncate">bagian dari: {todo.parentTitle}</span>
            </p>
          )}

          {todo.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {todo.description}
            </p>
          )}

          {/* Badge tugas besar: siap di-breakdown */}
          {isBigTask(todo.estimateMinutes) && (
            <Badge
              variant="outline"
              className="px-1.5 py-0 text-[9px] text-primary border-primary/30"
            >
              ⚡ Tugas besar — bisa dipecah
            </Badge>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <Badge
              variant="outline"
              className={`px-1.5 py-0 text-[10px] font-medium ${priority.className}`}
            >
              {priority.label}
            </Badge>

            {todo.area && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] capitalize">
                {todo.area}
              </Badge>
            )}

            {todo.dueDate && (
              <span
                className={`flex items-center gap-1 text-[10px] ${
                  isOverdue ? "font-medium text-destructive" : "text-muted-foreground"
                }`}
              >
                <CalendarDays className="size-3" />
                {format(new Date(todo.dueDate), "d MMM", { locale: id })}
                {isOverdue && " • overdue"}
              </span>
            )}

            {todo.estimateMinutes ? (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="size-3" />
                {formatMinutes(todo.estimateMinutes)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
