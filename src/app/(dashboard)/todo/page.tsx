import { TodoWorkspace } from "@/components/todo/todo-workspace";

export const metadata = {
  title: "Todo — LifeOS",
  description: "Kanban board tugas harian dengan saran prioritas AI.",
};

export default function TodoPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Todo</h1>
          <p className="text-muted-foreground">
            Kanban board — seret tugas antar kolom untuk update status.
          </p>
        </div>
      </header>

      <TodoWorkspace />
    </div>
  );
}
