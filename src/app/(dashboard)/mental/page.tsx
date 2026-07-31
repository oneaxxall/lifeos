import { MentalWorkspace } from "@/components/mental/mental-workspace";

export const metadata = {
  title: "Mental Health — LifeOS",
  description: "Mood harian, jurnal refleksi, dan dukungan AI.",
};

export default function MentalPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Mental Health</h1>
        <p className="text-muted-foreground">
          Catat mood, refleksi, dan dapatkan dukungan — ruang amanmu.
        </p>
      </header>

      <MentalWorkspace />
    </div>
  );
}
