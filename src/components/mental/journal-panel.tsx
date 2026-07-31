"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { NotebookPen, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface JournalItem {
  id: number;
  date: string;
  content: string;
  prompt: string;
}

const PROMPTS = [
  "Apa yang paling kamu syukuri hari ini?",
  "Apa satu hal yang berjalan baik minggu ini?",
  "Apa yang menguras energimu akhir-akhir ini?",
  "Kalau bisa mengulang satu momen hari ini, apa yang akan kamu ubah?",
  "Hal kecil apa yang membuatmu tersenyum hari ini?",
];

interface Props {
  journals: JournalItem[];
  onChanged: () => void;
}

/** Jurnal singkat + prompt refleksi AI (MEN-02). */
export function JournalPanel({ journals, onChanged }: Props) {
  const [content, setContent] = React.useState("");
  const [prompt, setPrompt] = React.useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const [saving, setSaving] = React.useState(false);

  const rotatePrompt = () => {
    const others = PROMPTS.filter((p) => p !== prompt);
    setPrompt(others[Math.floor(Math.random() * others.length)]);
  };

  const save = async () => {
    const text = content.trim();
    if (!text) {
      toast.error("Tulis dulu isi jurnalnya");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/mental/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, prompt }),
      });
      if (!res.ok) throw new Error();
      toast.success("Jurnal tersimpan ✨");
      setContent("");
      rotatePrompt();
      onChanged();
    } catch {
      toast.error("Gagal menyimpan jurnal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <NotebookPen className="size-4 text-violet-600 dark:text-violet-400" /> Jurnal refleksi
      </p>

      {/* Prompt refleksi */}
      <div className="mb-3 flex items-start gap-2 rounded-lg bg-violet-500/5 p-3">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-violet-700 dark:text-violet-300">{prompt}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={rotatePrompt}
          aria-label="Ganti prompt refleksi"
        >
          <RefreshCw className="size-3" />
        </Button>
      </div>

      <Textarea
        placeholder="Tulis bebas… (ini ruang amanmu, hanya disimpan lokal)"
        rows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="resize-none"
      />
      <div className="mt-2 flex justify-end">
        <Button onClick={() => void save()} disabled={saving} size="sm">
          {saving ? "Menyimpan…" : "Simpan jurnal"}
        </Button>
      </div>

      {/* Riwayat jurnal */}
      {journals.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <NotebookPen className="size-3" /> Riwayat jurnal
            <Badge variant="secondary" className="text-[9px]">{journals.length}</Badge>
          </p>
          <ul className="max-h-[240px] space-y-1.5 overflow-y-auto pr-1">
            {journals.map((j) => (
              <li key={j.id} className="rounded-lg border border-border/50 p-2.5">
                <p className="mb-1 text-[10px] text-muted-foreground">
                  {format(new Date(j.date), "d MMMM yyyy", { locale: id })}
                  {j.prompt && <span className="italic"> · {j.prompt}</span>}
                </p>
                <p className="text-xs leading-relaxed text-foreground/90">{j.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
