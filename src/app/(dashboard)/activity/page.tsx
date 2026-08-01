import { ActivityWorkspace } from "@/components/activity/activity-workspace";

export const metadata = {
  title: "Activity — LifeOS",
  description: "Catat aktivitas harian secara manual dengan waktu, kategori & tags.",
};

export default function ActivityPage() {
  return <ActivityWorkspace />;
}
