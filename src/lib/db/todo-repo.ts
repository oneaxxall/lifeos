import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { todos, type Todo, type TodoStatus } from "@/lib/db/schema";

export const KANBAN_COLUMNS: TodoStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "done",
];

/** Ambil semua tugas, dikelompokkan per kolom kanban (urut position).
 *  Sub-tugas (parentId) ikut sertakan judul induk via lookup. */
export function listTodosByColumn(): Record<TodoStatus, Todo[]> {
  const rows = db
    .select()
    .from(todos)
    .orderBy(asc(todos.position), asc(todos.createdAt))
    .all();

  const result = {
    backlog: [],
    todo: [],
    in_progress: [],
    done: [],
  } as Record<TodoStatus, Todo[]>;

  // Map id → judul untuk sub-tugas
  const titleById = new Map(rows.map((r) => [r.id, r.title]));

  for (const row of rows) {
    const status = (row.status as TodoStatus) || "backlog";
    const withParent = {
      ...row,
      parentTitle: row.parentId ? titleById.get(row.parentId) ?? null : null,
    };
    if (result[status]) result[status].push(withParent);
    else result.backlog.push(withParent);
  }
  return result;
}

/** Posisi maksimum di sebuah kolom (untuk append tugas baru) */
export function maxPositionInColumn(status: TodoStatus): number {
  const rows = db
    .select()
    .from(todos)
    .where(eq(todos.status, status))
    .all();
  return rows.reduce((max, r) => Math.max(max, r.position), -1) + 1;
}

/** Pindahkan tugas antar kolom / urutkan ulang (drag & drop) */
export function moveTodo(
  id: number,
  targetStatus: TodoStatus,
  targetPosition: number
): Todo | null {
  const todo = db.select().from(todos).where(eq(todos.id, id)).get();
  if (!todo) return null;

  const fromStatus = (todo.status as TodoStatus) || "backlog";

  // Geser tugas lain di kolom ASAL (jika pindah kolom)
  if (fromStatus !== targetStatus) {
    const siblings = db
      .select()
      .from(todos)
      .where(eq(todos.status, fromStatus))
      .all()
      .filter((t) => t.id !== id)
      .sort((a, b) => a.position - b.position);

    siblings.forEach((s, i) => {
      db.update(todos)
        .set({ position: i })
        .where(eq(todos.id, s.id))
        .run();
    });
  }

  // Sisipkan di kolom target
  const targetSiblings = db
    .select()
    .from(todos)
    .where(eq(todos.status, targetStatus))
    .all()
    .filter((t) => t.id !== id)
    .sort((a, b) => a.position - b.position);

  targetSiblings.forEach((s) => {
    let newPos = s.position;
    if (s.position >= targetPosition) newPos = s.position + 1;
    if (newPos !== s.position) {
      db.update(todos)
        .set({ position: newPos })
        .where(eq(todos.id, s.id))
        .run();
    }
  });

  const updated = db
    .update(todos)
    .set({
      status: targetStatus,
      position: targetPosition,
      completedAt:
        targetStatus === "done"
          ? new Date().toISOString()
          : "",
    })
    .where(eq(todos.id, id))
    .returning()
    .get();

  return updated;
}
