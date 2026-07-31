import { NetworkingWorkspace } from "@/components/networking/networking-workspace";

export const metadata = {
  title: "Networking — LifeOS",
  description: "Kelola relasi profesional dengan bantuan AI.",
};

export default function NetworkingPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Networking</h1>
        <p className="text-muted-foreground">
          Catat relasi, jaga kehangatan — AI mengingatkan follow-up yang terlupakan.
        </p>
      </header>

      <NetworkingWorkspace />
    </div>
  );
}
