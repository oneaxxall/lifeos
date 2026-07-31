"use client";

import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/todo/task-card";
import {
  getColumnConfig,
} from "@/components/todo/kanban-config";
import type { Todo, TodoStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface Props {
  status: TodoStatus;
  todos: (Todo & { parentTitle?: string | null })[];
  onAdd: (status: TodoStatus) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onBreakdown?: (todo: Todo) => void;
}

/** Satu kolom kanban — drop target + daftar kartu yang bisa di-sort. */
export function KanbanColumn({ status, todos, onAdd, onEdit, onDelete, onBreakdown }: Props) {
  const config = getColumnConfig(status);
  const Icon = config.icon;
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[300px] w-full shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors sm:w-[280px]",
        isOver && "border-primary/60 bg-primary/5 ring-1 ring-primary/30"
      )}
    >
      {/* Header kolom */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Icon className={cn("size-4", config.accent)} />
        <span className="text-sm font-semibold">{config.title}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {todos.length}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-6 text-muted-foreground hover:text-foreground"
          onClick={() => onAdd(status)}
          aria-label={`Tambah tugas di ${config.title}`}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Daftar kartu */}
      <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
          {todos.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border py-8 text-xs text-muted-foreground/70">
              Tarik tugas ke sini
            </div>
          ) : (
            todos.map((todo) => (
              <TaskCard
                key={todo.id}
                todo={todo}
                onEdit={onEdit}
                onDelete={onDelete}
                onBreakdown={onBreakdown}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
