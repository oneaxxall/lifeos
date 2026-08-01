import { PomodoroWorkspace } from "@/components/pomodoro/pomodoro-workspace";

export const metadata = {
  title: "Pomodoro — LifeOS",
  description: "Teknik fokus 25/5 — sesi selesai otomatis tercatat di Activity.",
};

export default function PomodoroPage() {
  return <PomodoroWorkspace />;
}
