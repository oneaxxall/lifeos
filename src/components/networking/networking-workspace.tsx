"use client";

import * as React from "react";
import { toast } from "sonner";
import { ContactPanel, type ContactItem } from "@/components/networking/contact-panel";
import { NetworkingInsightPanel } from "@/components/networking/networking-insight-panel";

/** Orchestrator Networking — state, fetch, compose komponen. */
export function NetworkingWorkspace() {
  const [contacts, setContacts] = React.useState<ContactItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const loadAll = React.useCallback(async () => {
    try {
      const res = await fetch("/api/networking/contacts");
      const json = await res.json();
      setContacts(json.data ?? []);
    } catch {
      toast.error("Gagal memuat kontak");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal — fetch langsung di effect (setState hanya setelah await)
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/networking/contacts")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setContacts(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat kontak");
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
      <NetworkingInsightPanel refreshKey={refreshKey} />
      <ContactPanel items={contacts} onChanged={handleChanged} />
    </div>
  );
}
