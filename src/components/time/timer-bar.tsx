"use client";

import * as React from "react";
import { Play, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ActivityCategoryOption {
  id: number;
  name: string;
  value: "produktif" | "netral" | "buang";
  color: string;
}

export interface RunningActivity {
  id: number;
  name: string;
  startedAt: string;
  categoryName: string | null;
  categoryColor: string | null;
}

interface Props {
  categories: ActivityCategoryOption[];
  running: RunningActivity | null;
  onChanged: () => void;
}

function formatElapsed(startedAt: string): string {
  const diff = Math.max(0, (Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = Math.floor(diff % 60);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/** Timer 1-ketukan (TIM-01) — mulai/hentikan aktivitas dengan satu klik.
 *  Single responsibility: hanya urusan timer berjalan. */
export function TimerBar({ categories, running, onChanged }: Props) {
  const [name, setName] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [elapsed, setElapsed] = React.useState(() =>
    running ? formatElapsed(running.startedAt) : "00:00:00"
  );
  const [busy, setBusy] = React.useState(false);

  // Tick tiap detik saat ada timer berjalan
  React.useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed(formatElapsed(running.startedAt)), 1000);
    return () => clearInterval(iv);
  }, [running]);

  const start = async () => {
    const n = name.trim();
    if (!n) {
      toast.error("Tulis dulu apa yang sedang kamu kerjakan");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/time/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, categoryId: categoryId ? Number(categoryId) : null }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Timer dimulai: ${n}`);
      setName("");
      setCategoryId("");
      onChanged();
    } catch {
      toast.error("Gagal memulai timer");
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/time/activities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: running?.id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Timer dihentikan ⏱");
      onChanged();
    } catch {
      toast.error("Gagal menghentikan timer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm transition-colors",
        running
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card"
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Timer className={cn("size-4", running ? "text-primary animate-pulse" : "text-primary")} />
          Timer aktivitas
        </p>
        {running && (
          <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/10 text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            <span className="font-mono text-xs tabular-nums">{elapsed}</span>
          </Badge>
        )}
      </div>

      {running ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{running.name}</p>
            <p className="text-xs text-muted-foreground">
              {running.categoryName ? (
                <span className="capitalize">{running.categoryName}</span>
              ) : (
                "Tanpa kategori"
              )}{" "}
              · mulai {new Date(running.startedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <Button onClick={() => void stop()} disabled={busy} className="gap-2">
            <Square className="size-4" /> Stop
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Sedang apa? (mis. Deep work — presentasi Q3)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void start()}
            className="min-w-48 flex-1"
            autoFocus
          />
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Kategori (opsional)" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)} className="capitalize">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => void start()} disabled={busy} className="gap-2">
            <Play className="size-4" /> Mulai
          </Button>
        </div>
      )}
    </div>
  );
}
