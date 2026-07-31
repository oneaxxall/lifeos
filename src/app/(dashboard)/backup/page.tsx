import { BackupWorkspace } from "@/components/backup/backup-workspace";

export const metadata = {
  title: "Backup — LifeOS",
  description: "Backup & restore seluruh data LifeOS.",
};

export default function BackupPage() {
  return <BackupWorkspace />;
}
