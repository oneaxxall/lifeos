import { SpiritualWorkspace } from "@/components/spiritual/spiritual-workspace";

export const metadata = {
  title: "Spiritual — LifeOS",
  description: "Ritual harian, streak, refleksi, dan target spiritual.",
};

export default function SpiritualPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Spiritual</h1>
        <p className="text-muted-foreground">
          Jaga konsistensi ritual — AI mengingatkan dengan lembut, tanpa menghakimi.
        </p>
      </header>

      <SpiritualWorkspace />
    </div>
  );
}
