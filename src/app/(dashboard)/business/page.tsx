import { BusinessWorkspace } from "@/components/business/business-workspace";

export const metadata = {
  title: "Business — LifeOS",
  description: "Ide bisnis, proyek, dan rencana eksekusi AI.",
};

export default function BusinessPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Business</h1>
        <p className="text-muted-foreground">
          Tangkap ide, kelola proyek, dan biarkan AI menyusun langkah eksekusi.
        </p>
      </header>

      <BusinessWorkspace />
    </div>
  );
}
