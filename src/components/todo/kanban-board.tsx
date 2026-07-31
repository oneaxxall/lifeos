"use client";

import * as React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { KanbanColumn } from "@/components/todo/kanban-column";
import { TaskCard } from "@/components/todo/task-card";
import { TaskDialog } from "@/components/todo/task-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KANBAN_COLUMNS_CONFIG } from "@/components/todo/kanban-config";
import type { Todo, TodoStatus } from "@/lib/db/schema";

type Columns = Record<TodoStatus, Todo[]>;

const EMPTY_COLUMNS: Columns = {
  backlog: [],
  todo: [],
  in_progress: [],
  done: [],
};

/** Orchestrator kanban — state, fetch, drag & drop, dialog. */
export function KanbanBoard({ onChange }: { onChange?: () => void }) {
  const [columns, setColumns] = React.useState<Columns>(EMPTY_COLUMNS);
  const [loading, setLoading] = React.useState(true);
  const [activeTodo, setActiveTodo] = React.useState<Todo | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTodo, setEditingTodo] = React.useState<Todo | null>(null);
  const [defaultStatus, setDefaultStatus] = React.useState<TodoStatus>("backlog");
  const [deleteTarget, setDeleteTarget] = React.useState<Todo | null>(null);
  const [breakdownTarget, setBreakdownTarget] = React.useState<Todo | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [breakingDown, setBreakingDown] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/todos");
      const json = await res.json();
      if (json.data) {
        const next: Columns = { ...EMPTY_COLUMNS };
        for (const status of KANBAN_COLUMNS_CONFIG.map((c) => c.status)) {
          next[status] = json.data[status] ?? [];
        }
        setColumns(next);
      }
    } catch {
      toast.error("Gagal memuat tugas");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/todos")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.data) {
          const next: Columns = { ...EMPTY_COLUMNS };
          for (const status of KANBAN_COLUMNS_CONFIG.map((c) => c.status)) {
            next[status] = json.data[status] ?? [];
          }
          setColumns(next);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat tugas");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const findTodo = (id: number): { todo: Todo; status: TodoStatus } | null => {
    for (const status of KANBAN_COLUMNS_CONFIG.map((c) => c.status)) {
      const todo = columns[status].find((t) => t.id === id);
      if (todo) return { todo, status };
    }
    return null;
  };

  const onDragStart = (e: DragEndEvent) => {
    const found = findTodo(Number(e.active.id));
    if (found) setActiveTodo(found.todo);
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = Number(active.id);
    const found = findTodo(activeId);
    if (!found) return;

    const overId = String(over.id);
    // Over langsung di atas kolom
    const overStatus = KANBAN_COLUMNS_CONFIG.find((c) => c.status === overId)
      ?.status as TodoStatus | undefined;

    if (overStatus && found.status !== overStatus) {
      setColumns((prev) => {
        const from = prev[found.status].filter((t) => t.id !== activeId);
        const target = [...prev[overStatus], { ...found.todo, status: overStatus }];
        return { ...prev, [found.status]: from, [overStatus]: target };
      });
    } else if (!overStatus) {
      // Over di atas kartu lain
      const overTodo = findTodo(Number(over.id));
      if (!overTodo) return;
      const overStatus2 = overTodo.status;
      if (found.status === overStatus2) {
        setColumns((prev) => {
          const oi = prev[found.status].findIndex((t) => t.id === activeId);
          const ni = prev[overStatus2].findIndex((t) => t.id === Number(over.id));
          if (oi < 0 || ni < 0) return prev;
          const moved = arrayMove(prev[found.status], oi, ni);
          return { ...prev, [found.status]: moved };
        });
      }
    }
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveTodo(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = Number(active.id);
    const found = findTodo(activeId);
    if (!found) return;

    const overStatus =
      (KANBAN_COLUMNS_CONFIG.find((c) => c.status === String(over.id))?.status as
        | TodoStatus
        | undefined) ?? findTodo(Number(over.id))?.status;

    if (!overStatus) return;

    // Hitung posisi target
    const targetList = columns[overStatus];
    const overIndex = targetList.findIndex((t) => t.id === Number(over.id));
    const targetPosition = overIndex >= 0 ? overIndex : targetList.length;

    // Persist ke server
    try {
      const res = await fetch("/api/todos/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeId, status: overStatus, position: targetPosition }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tugas dipindahkan");
      void load();
      onChange?.();
    } catch {
      toast.error("Gagal memindahkan — memuat ulang");
      void load();
    }
  };

  const openAdd = (status: TodoStatus) => {
    setEditingTodo(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  };

  const openEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setDialogOpen(true);
  };

  const remove = async (todo: Todo) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Tugas dihapus");
      setDeleteTarget(null);
      void load();
      onChange?.();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const handleBreakdown = async (todo: Todo) => {
    setBreakingDown(true);
    try {
      const res = await fetch("/api/ai/todo-breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: todo.id }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error || "Gagal memecah tugas");
        setBreakdownTarget(null);
        return;
      }
      toast.success(
        `Dipecah jadi ${json.data.langkah.length} langkah (${json.source === "ai" ? "AI" : "offline"})`
      );
      setBreakdownTarget(null);
      void load();
      onChange?.();
    } catch {
      toast.error("Gagal memecah tugas");
    } finally {
      setBreakingDown(false);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS_CONFIG.map((c) => (
          <div key={c.status} className="h-[300px] w-[280px] shrink-0 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={(e) => void onDragEnd(e)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS_CONFIG.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              todos={columns[col.status]}
              onAdd={openAdd}
              onEdit={openEdit}
              onDelete={(t) => setDeleteTarget(t)}
              onBreakdown={(t) => setBreakdownTarget(t)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTodo ? (
            <div className="w-[264px]">
              <TaskCard
                todo={activeTodo}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDialog
        key={editingTodo ? `edit-${editingTodo.id}` : `create-${dialogOpen}`}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        todo={editingTodo}
        defaultStatus={defaultStatus}
        onSaved={() => {
          void load();
          onChange?.();
        }}
      />

      {/* Konfirmasi hapus tugas (shadcn AlertDialog — pengganti window.confirm) */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus tugas"
        description={`Hapus "${deleteTarget?.title}"?\n\nSub-tugasnya (jika ada) akan ikut terhapus.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />

      {/* Konfirmasi breakdown AI */}
      <ConfirmDialog
        open={breakdownTarget !== null}
        onOpenChange={(o) => !o && setBreakdownTarget(null)}
        title="Pecah dengan AI"
        description={`Pecah "${breakdownTarget?.title}" jadi sub-langkah kecil?\n\nSub-langkah akan dibuat di kolom ${
          breakdownTarget?.status === "backlog" ? "Backlog" : "To Do"
        }, estimasi dibagi rata.`}
        confirmLabel="Pecah sekarang"
        cancelLabel="Batal"
        busy={breakingDown}
        onConfirm={() => breakdownTarget && void handleBreakdown(breakdownTarget)}
      />
    </>
  );
}
