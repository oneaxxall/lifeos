"use client";

import * as React from "react";
import { KanbanBoard } from "@/components/todo/kanban-board";
import { TodoPriorityPanel } from "@/components/todo/todo-priority-panel";
import { TodoDelayPanel } from "@/components/todo/todo-delay-panel";

/** Workspace Todo — koordinasi panel AI & kanban (refreshKey bersama). */
export function TodoWorkspace() {
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <div className="space-y-5">
      <TodoDelayPanel refreshKey={refreshKey} />
      <TodoPriorityPanel refreshKey={refreshKey} />
      <KanbanBoard onChange={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}
