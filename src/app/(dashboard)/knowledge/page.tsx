import { KnowledgeList } from "@/components/knowledge/knowledge-list";
import { QuickCapture } from "@/components/knowledge/quick-capture";

export const metadata = {
  title: "Knowledge — LifeOS",
  description: "Second brain: capture ide, catatan, dan extended memory AI.",
};

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Knowledge</h1>
          <p className="text-muted-foreground">
            Second brain Anda — ide, catatan, dan memori jangka panjang AI.
          </p>
        </div>
        <QuickCapture />
      </header>

      <KnowledgeList />
    </div>
  );
}
