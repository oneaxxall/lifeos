import { FamilyWorkspace } from "@/components/family/family-workspace";

export const metadata = {
  title: "Family — LifeOS",
  description: "Curhat keluarga & nasihat AI dengan perspektif hangat.",
};

export default function FamilyPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Family</h1>
        <p className="text-muted-foreground">
          Ruang curhat keluarga — ceritakan keresahanmu, AI menemanimu.
        </p>
      </header>

      <FamilyWorkspace />
    </div>
  );
}
