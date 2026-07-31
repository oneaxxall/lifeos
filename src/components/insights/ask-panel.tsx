"use client";

import * as React from "react";
import { Loader2, MessageCircleQuestion, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/** Tanya jawab natural dengan data LifeOS (IN-06). */
export function AskPanel() {
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [source, setSource] = React.useState<"ai" | "heuristik">("heuristik");
  const [asking, setAsking] = React.useState(false);

  const ask = async () => {
    const q = question.trim();
    if (!q) {
      toast.error("Tulis pertanyaanmu dulu");
      return;
    }
    setAsking(true);
    try {
      const res = await fetch("/api/insights/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const json = await res.json();
      if (!res.ok || !json.answer) throw new Error();
      setAnswer(json.answer);
      setSource(json.source);
    } catch {
      toast.error("Gagal bertanya — coba lagi");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <MessageCircleQuestion className="size-4 text-primary" /> Tanya AI tentang hidupmu
      </p>

      <Textarea
        placeholder='mis. "Kenapa pengeluaranku naik bulan ini?" atau "Bagaimana pola tidurku minggu ini?"'
        rows={2}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void ask();
          }
        }}
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground/70">
          Jawaban berbasis data LifeOS-mu — tanya apa saja lintas fitur.
        </p>
        <Button onClick={() => void ask()} disabled={asking} size="sm" className="gap-2">
          {asking ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Mencari…
            </>
          ) : (
            <>
              <Send className="size-4" /> Tanya
            </>
          )}
        </Button>
      </div>

      {answer && (
        <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
          <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-primary">
            Jawaban AI
            {source === "heuristik" && (
              <Badge variant="outline" className="text-[9px]">
                offline
              </Badge>
            )}
          </p>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{answer}</pre>
        </div>
      )}
    </div>
  );
}
