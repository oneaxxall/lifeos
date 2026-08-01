"use client";

import * as React from "react";
import { Clapperboard, Lightbulb, MessageSquareText, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentIdeasPanel } from "@/components/content/content-ideas-panel";
import { ContentScriptsPanel } from "@/components/content/content-scripts-panel";
import { AffiliateProductsPanel } from "@/components/content/affiliate-products-panel";

type Tab = "ide" | "naskah" | "tracker";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "ide", label: "Ide Konten", icon: Lightbulb },
  { id: "naskah", label: "Naskah", icon: MessageSquareText },
  { id: "tracker", label: "Affiliate Tracker", icon: ShoppingBag },
];

/** Halaman Content Creation — TikTok Affiliate Indonesia (Ide → Naskah → Tracker). */
export function ContentWorkspace() {
  const [tab, setTab] = React.useState<Tab>("ide");

  return (
    <div className="space-y-5">
      {/* ── Header halaman ── */}
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <Clapperboard className="size-5 text-primary" />
          </span>
          Content
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Content creation TikTok Affiliate — ide hook, naskah video & tracker produk dalam satu alur.
        </p>
      </header>

      {/* ── Tab ── */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors",
              tab === t.id
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Panel aktif ── */}
      {tab === "ide" && <ContentIdeasPanel />}
      {tab === "naskah" && <ContentScriptsPanel />}
      {tab === "tracker" && <AffiliateProductsPanel />}
    </div>
  );
}
