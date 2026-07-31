import { SickWorkspace } from "@/components/sick/sick-workspace";

export const metadata = {
  title: "Sick — LifeOS",
  description: "Catat tidak enak badan & dapatkan saran AI.",
};

export default function SickPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Sick</h1>
        <p className="text-muted-foreground">
          Catat apa yang kamu rasakan — AI memberi saran perawatan mandiri.
        </p>
      </header>

      <SickWorkspace />
    </div>
  );
}
