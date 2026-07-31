import { TeamWorkspace } from "@/components/team/team-workspace";

export const metadata = {
  title: "Team — LifeOS",
  description: "Kelola tim: anggota, 1-on-1, dan analisa AI.",
};

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <p className="text-muted-foreground">
          Data tim terpusat: anggota, riwayat 1-on-1, dan sinyal yang perlu diperhatikan.
        </p>
      </header>

      <TeamWorkspace />
    </div>
  );
}
