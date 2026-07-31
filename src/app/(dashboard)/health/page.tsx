import { HealthWorkspace } from "@/components/health/health-workspace";

export const metadata = {
  title: "Health — LifeOS",
  description: "Lacak berat, tidur, olahraga, langkah — dengan analisa AI.",
};

export default function HealthPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Health</h1>
        <p className="text-muted-foreground">
          Catat kesehatan harian, pantau tren, capai target.
        </p>
      </header>

      <HealthWorkspace />
    </div>
  );
}
