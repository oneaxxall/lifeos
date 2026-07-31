"use client";

import * as React from "react";
import { toast } from "sonner";
import { TeamMemberPanel, type TeamMemberItem } from "@/components/team/team-member-panel";
import { OneOnOnePanel, type OneOnOneItem } from "@/components/team/one-on-one-panel";
import { TeamInsightPanel } from "@/components/team/team-insight-panel";

/** Orchestrator Team — state, fetch, compose komponen. */
export function TeamWorkspace() {
  const [members, setMembers] = React.useState<TeamMemberItem[]>([]);
  const [onones, setOnones] = React.useState<OneOnOneItem[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const loadAll = React.useCallback(async () => {
    try {
      const [memberRes, ononeRes] = await Promise.all([
        fetch("/api/team/members"),
        fetch("/api/team/onones"),
      ]);
      const [memberJson, ononeJson] = await Promise.all([memberRes.json(), ononeRes.json()]);
      setMembers(memberJson.data ?? []);
      setOnones(ononeJson.data ?? []);
    } catch {
      toast.error("Gagal memuat data tim");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal — fetch langsung di effect (setState hanya setelah await)
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/team/members"), fetch("/api/team/onones")])
      .then(([memberRes, ononeRes]) => Promise.all([memberRes.json(), ononeRes.json()]))
      .then(([memberJson, ononeJson]) => {
        if (cancelled) return;
        setMembers(memberJson.data ?? []);
        setOnones(ononeJson.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat data tim");
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
      <TeamInsightPanel refreshKey={refreshKey} />

      <div className="grid gap-5 xl:grid-cols-2">
        <TeamMemberPanel
          items={members}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChanged={handleChanged}
        />
        <OneOnOnePanel
          members={members}
          onones={onones}
          selectedId={selectedId}
          onChanged={handleChanged}
        />
      </div>
    </div>
  );
}
