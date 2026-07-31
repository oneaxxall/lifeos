"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Rocket, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { ExecutionPlan } from "@/lib/ai/business-insight";
import type { IdeaItem } from "@/components/business/idea-panel";

interface Props {
  idea: IdeaItem | null;
  onClose: () => void;
  onPushed: () => void;
}

/** Rencana eksekusi 30 hari dari ide + kirim ke Todo (BIZ-03). */
export function ExecutionDialog({ idea, onClose, onPushed }: Props) {
  const [plan, setPlan] = React.useState<ExecutionPlan | null>(null);
  const [source, setSource] = React.useState<"ai" | "heuristik">("heuristik");
  const [loading, setLoading] = React.useState(false);
  const [pushing, setPushing] = React.useState(false);
  const [pushed, setPushed] = React.useState(false);

  // Generate rencana saat dialog dibuka (parent key-remount per ide → state sudah fresh)
  React.useEffect(() => {
    if (!idea) return;
    let cancelled = false;
    fetch("/api/business/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: idea.title, description: idea.description }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.ok && json.data) {
          setPlan(json.data);
          setSource(json.source);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal membuat rencana");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idea]);

  const pushToTodo = async () => {
    if (!idea || !plan) return;
    setPushing(true);
    try {
      const res = await fetch("/api/business/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: idea.title,
          description: idea.description,
          pushToTodo: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error();
      setPushed(true);
      toast.success(`${json.pushed} langkah masuk ke Todo 📋`);
      onPushed();
    } catch {
      toast.error("Gagal kirim ke Todo");
    } finally {
      setPushing(false);
    }
  };

  return (
    <Dialog open={idea !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Rocket className="size-5 text-primary" />
            Rencana 30 hari
            {source === "heuristik" && (
              <Badge variant="outline" className="ml-auto text-[9px]">
                offline
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {idea && (
          <p className="-mt-2 text-sm text-muted-foreground">
            Ide: <span className="font-medium text-foreground">&quot;{idea.title}&quot;</span>
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" /> AI menyusun langkah eksekusi…
          </div>
        ) : plan ? (
          <div className="space-y-3">
            <ol className="space-y-2">
              {plan.langkah.map((langkah, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{langkah.judul}</p>
                      <Badge variant="secondary" className="text-[9px]">
                        {langkah.estimasi}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{langkah.detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="rounded-lg bg-primary/5 p-3 text-center text-sm font-medium text-primary">
              {plan.ringkasan}
            </p>

            <div className="flex justify-end gap-2">
              {pushed ? (
                <Button disabled className="gap-2">
                  <CheckCircle2 className="size-4" /> Sudah masuk Todo
                </Button>
              ) : (
                <Button onClick={() => void pushToTodo()} disabled={pushing} className="gap-2">
                  {pushing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Mengirim…
                    </>
                  ) : (
                    <>
                      <Send className="size-4" /> Kirim ke Todo
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">Gagal membuat rencana.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
