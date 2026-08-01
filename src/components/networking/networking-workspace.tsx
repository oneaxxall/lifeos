"use client";

import * as React from "react";
import { ChevronDown, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { ContactForm } from "@/components/networking/contact-form";
import { ContactPanel, type ContactItem } from "@/components/networking/contact-panel";
import { NetworkingInsightPanel } from "@/components/networking/networking-insight-panel";
import { cn } from "@/lib/utils";

/** Orchestrator Networking — state, fetch, compose komponen. */
export function NetworkingWorkspace() {
  const [contacts, setContacts] = React.useState<ContactItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [formOpen, setFormOpen] = React.useState(false);

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

      {/* ── Toggle form tambah kontak — default tertutup ── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <button
          onClick={() => setFormOpen((o) => !o)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/20"
          aria-expanded={formOpen}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRoundPlus className="size-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Tambah kontak</span>
            <span className="block text-[11px] text-muted-foreground">
              Catat relasi baru — jangan sampai follow-up terlewat 🤝
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              formOpen && "rotate-180"
            )}
          />
        </button>
        {formOpen && (
          <div className="border-t border-border/60">
            <ContactForm onSaved={() => void loadAll()} />
          </div>
        )}
      </div>

      <ContactPanel items={contacts} onChanged={handleChanged} />
    </div>
  );
}
