import { InsightsWorkspace } from "@/components/insights/insights-workspace";

export const metadata = {
  title: "Insights — LifeOS",
  description: "Hub AI — ringkasan harian, laporan mingguan, dan tanya jawab lintas fitur.",
};

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
        <p className="text-muted-foreground">
          Jantung LifeOS — semua data fitur bertemu di sini, AI menjadi teman tandemmu.
        </p>
      </header>

      <InsightsWorkspace />
    </div>
  );
}
