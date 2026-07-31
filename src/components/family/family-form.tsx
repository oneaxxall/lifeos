"use client";

import * as React from "react";
import { HeartHandshake, Loader2, MessageCircleHeart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { FamilyAdvice } from "@/lib/ai/family-advice";

interface Props {
  onSaved: () => void;
}

const PEOPLE_OPTIONS = ["Pasangan", "Anak", "Orang tua", "Mertua", "Saudara", "Mertua & keluarga besar"];
const MOOD_OPTIONS = ["Tenang", "Cemas", "Lelah", "Kesal", "Sedih", "Bersyukur", "Campur aduk"];

/** Form curhatan keluarga — tulis keresahan, AI menasehati, hasil di modal. */
export function FamilyForm({ onSaved }: Props) {
  const [content, setContent] = React.useState("");
  const [people, setPeople] = React.useState("");
  const [mood, setMood] = React.useState("");
  const [analyzing, setAnalyzing] = React.useState(false);
  const [advice, setAdvice] = React.useState<FamilyAdvice | null>(null);
  const [source, setSource] = React.useState<"ai" | "heuristik">("heuristik");
  const [modalOpen, setModalOpen] = React.useState(false);

  const analyze = async () => {
    const c = content.trim();
    if (!c) {
      toast.error("Tulis dulu curhatanmu — ruang ini untukmu");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: c, people, mood }),
      });
      const json = await res.json();
      if (!res.ok || !json.advice) throw new Error(json.error || "Gagal");
      setAdvice(json.advice.data);
      setSource(json.source);
      setModalOpen(true);
      setContent("");
      onSaved();
    } catch {
      toast.error("Gagal menganalisa — coba lagi");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <MessageCircleHeart className="size-4 text-rose-500" />
          Curhat keluarga
          <span className="text-[10px] font-normal text-muted-foreground">
            (ruang aman — hanya kamu & AI yang membaca)
          </span>
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Ada apa? Ceritakan apa adanya. <span className="text-destructive">*</span>
            </p>
            <Textarea
              placeholder="mis. Belakangan sering beda pendapat dengan pasangan soal pola asuh anak, rasanya capek sendiri…"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Terlibat dengan siapa?</p>
              <Select value={people} onValueChange={setPeople}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Pilih (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {PEOPLE_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p} className="text-sm">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Suasana hati</p>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Pilih (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {MOOD_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m} className="text-sm">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="max-w-[55%] text-[10px] leading-relaxed text-muted-foreground/70">
              AI memberi perspektif & dukungan, bukan pengganti konseling keluarga jika dibutuhkan.
            </p>
            <Button onClick={() => void analyze()} disabled={analyzing} className="gap-2">
              {analyzing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Mendengarkan…
                </>
              ) : (
                <>
                  <HeartHandshake className="size-4" /> Minta nasihat AI
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal hasil nasihat AI */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Users className="size-5 text-rose-500" />
              Nasihat AI
              {source === "heuristik" && (
                <Badge variant="outline" className="ml-auto text-[9px]">
                  offline
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {advice && (
            <div className="space-y-3">
              {/* Empati */}
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                <p className="mb-1 text-xs font-semibold text-rose-500">🫂 Empati</p>
                <p className="text-sm leading-relaxed">{advice.empati}</p>
              </div>

              {/* Perspektif */}
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">💭 Perspektif</p>
                <p className="text-sm leading-relaxed">{advice.perspektif}</p>
              </div>

              {/* Saran */}
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="mb-2 text-xs font-semibold text-rose-500">💡 Langkah kecil hari ini</p>
                <ul className="space-y-1.5">
                  {advice.saran.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-[9px] font-bold text-rose-500">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Ringkasan */}
              <p className="rounded-lg bg-primary/5 p-3 text-center text-sm font-medium text-primary">
                {advice.ringkasan}
              </p>

              <p className="text-[10px] leading-relaxed text-muted-foreground/70">
                ⚠️ Ini dukungan & perspektif dari AI, bukan pengganti konseling keluarga profesional.
                Jika situasi menyangkut keselamatan atau kekerasan, segera hubungi pihak yang bisa membantu.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
