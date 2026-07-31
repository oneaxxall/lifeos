"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CheckCircle2, History, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface InsightItem {
  id: number;
  type: string;
  title: string;
  content: string;
  status: "baru" | "dilakukan" | "diabaikan";
  source: string;
  date: string;
}

interface Props {
  items: InsightItem[];
  onChanged: () => void;
}

const TYPE_META: Record<string, { label: string; className: string }> = {
  harian: { label: "Harian", className: "bg-primary/10 text-primary" },
  mingguan: { label: "Mingguan", className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  korelasi: { label: "Korelasi", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  tanya: { label: "Tanya", className: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
};

/** Feed insight + feedback dilakukan/diabaikan (IN-03). */
export function InsightFeed({ items, onChanged }: Props) {
  const updateStatus = async (item: InsightItem, status: InsightItem["status"]) => {
    const res = await fetch("/api/insights", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status }),
    });
    if (res.ok) {
      toast.success(status === "dilakukan" ? "Insight ditandai dilakukan ✓" : "Insight diabaikan");
      onChanged();
    } else {
      toast.error("Gagal update");
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <History className="size-4 text-primary" /> Riwayat insight
        <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
      </p>

      <ul className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
        {items.map((item) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.harian;
          return (
            <li
              key={item.id}
              className={cn(
                "rounded-lg border border-border/60 p-3 transition-opacity",
                item.status !== "baru" && "opacity-60"
              )}
            >
              <div className="flex items-center gap-2">
                <Badge className={`text-[9px] ${meta.className}`}>{meta.label}</Badge>
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</p>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {format(new Date(item.date), "d MMM", { locale: id })}
                </span>
              </div>

              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.content}</p>

              {item.status === "baru" && (
                <div className="mt-2 flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[10px] text-emerald-600 hover:text-emerald-500"
                    onClick={() => void updateStatus(item, "dilakukan")}
                  >
                    <CheckCircle2 className="size-3" /> Dilakukan
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                    onClick={() => void updateStatus(item, "diabaikan")}
                  >
                    <XCircle className="size-3" /> Diabaikan
                  </Button>
                </div>
              )}

              {item.status === "dilakukan" && (
                <p className="mt-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ Ditandai dilakukan
                </p>
              )}
              {item.status === "diabaikan" && (
                <p className="mt-1.5 text-[10px] font-medium text-muted-foreground">
                  — Diabaikan
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
