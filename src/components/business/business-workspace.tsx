"use client";

import * as React from "react";
import { toast } from "sonner";
import { IdeaPanel, type IdeaItem } from "@/components/business/idea-panel";
import { ProjectPanel, type ProjectItem } from "@/components/business/project-panel";
import { BusinessInsightPanel } from "@/components/business/business-insight-panel";
import { ExecutionDialog } from "@/components/business/execution-dialog";

/** Orchestrator Business — state, fetch, compose komponen. */
export function BusinessWorkspace() {
  const [ideas, setIdeas] = React.useState<IdeaItem[]>([]);
  const [projects, setProjects] = React.useState<ProjectItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [execIdea, setExecIdea] = React.useState<IdeaItem | null>(null);

  const loadAll = React.useCallback(async () => {
    try {
      const [ideaRes, projRes] = await Promise.all([
        fetch("/api/business/ideas"),
        fetch("/api/business/projects"),
      ]);
      const [ideaJson, projJson] = await Promise.all([ideaRes.json(), projRes.json()]);
      setIdeas(ideaJson.data ?? []);
      setProjects(projJson.data ?? []);
    } catch {
      toast.error("Gagal memuat data bisnis");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal — fetch langsung di effect (setState hanya setelah await)
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/business/ideas"), fetch("/api/business/projects")])
      .then(([ideaRes, projRes]) => Promise.all([ideaRes.json(), projRes.json()]))
      .then(([ideaJson, projJson]) => {
        if (cancelled) return;
        setIdeas(ideaJson.data ?? []);
        setProjects(projJson.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat data bisnis");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChanged = () => {
    void loadAll();
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BusinessInsightPanel refreshKey={refreshKey} />

      <div className="grid gap-5 xl:grid-cols-2">
        <IdeaPanel
          items={ideas}
          onChanged={handleChanged}
          onExecute={setExecIdea}
        />
        <ProjectPanel items={projects} onChanged={handleChanged} />
      </div>

      <ExecutionDialog
        key={execIdea ? `exec-${execIdea.id}` : "exec-none"}
        idea={execIdea}
        onClose={() => setExecIdea(null)}
        onPushed={handleChanged}
      />
    </div>
  );
}
