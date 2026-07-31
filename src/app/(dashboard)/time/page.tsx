import { TimeWorkspace } from "@/components/time/time-workspace";

export const metadata = {
  title: "Time — LifeOS",
  description: "Timer aktivitas, ringkasan waktu, dan time block harian.",
};

export default function TimePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Time Management</h1>
        <p className="text-muted-foreground">
          Lacak aktivitas dengan 1 ketukan, lihat ke mana waktumu pergi.
        </p>
      </header>

      <TimeWorkspace />
    </div>
  );
}
