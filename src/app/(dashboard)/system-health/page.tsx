import { SystemHealthWorkspace } from "@/components/system/system-health-workspace";

export const metadata = {
  title: "System Health — LifeOS",
  description: "CPU, RAM, disk, server & Docker containers.",
};

export default function SystemHealthPage() {
  return <SystemHealthWorkspace />;
}
