"use client";

import * as React from "react";
import { CalendarClock, ClipboardList, Loader2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { SickAdvice } from "@/lib/ai/sick-advice";

interface Props {
  onSaved: () => void;
}

/** Form "catatan tidak enak badan" — isi gejala, AI menasehati, hasil di modal. */
export function SickForm({ onSaved }: Props) {
  const [symptoms, setSymptoms] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [analyzing, setAnalyzing] = React.useState(false);
  const [advice, setAdvice] = React.useState<SickAdvice | null>(null);
  const [source, setSource] = React.useState<"ai" | "heuristik">("heuristik");
  const [modalOpen, setModalOpen] = React.useState(false);

  const analyze = async () => {
    const s = symptoms.trim();
    if (!s) {
      toast.error("Tulis dulu apa yang kamu rasakan");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/sick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: s, duration, notes }),
      });
      const json = await res.json();
      if (!res.ok || !json.advice) throw new Error(json.error || "Gagal");
      setAdvice(json.advice.data);
      setSource(json.source);
      setModalOpen(true);
      setSymptoms("");
      setDuration("");
      setNotes("");
      onSaved();
    } catch {
      toast.error("Gagal menganalisa — coba lagi");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <div className="p-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Apa yang kamu rasakan? <span className="text-destructive">*</span>
            </p>
            <Textarea
              placeholder="mis. Demam 38°C sejak kemarin, badan pegal, kepala pusing, sedikit batuk…"
              rows={3}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Sudah berapa lama?</p>
              <div className="relative">
                <CalendarClock className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="mis. 2 hari"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Catatan tambahan (opsional)</p>
              <Input
                placeholder="mis. sudah minum obat X"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="max-w-[60%] text-[10px] leading-relaxed text-muted-foreground/70">
              ⚠️ AI memberi saran umum, bukan diagnosis medis. Segera ke dokter jika gejala berat.
            </p>
            <Button onClick={() => void analyze()} disabled={analyzing} className="gap-2">
              {analyzing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Menganalisa…
                </>
              ) : (
                <>
                  <Stethoscope className="size-4" /> Analisa dengan AI
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal hasil analisa AI */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="size-5 text-rose-500" />
              Analisa AI
              {source === "heuristik" && (
                <Badge variant="outline" className="ml-auto text-[9px]">
                  offline
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {advice && (
            <div className="space-y-3">
              {advice.needsProfessional && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                  <span className="text-lg">⚠️</span>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {advice.ringkasan}
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-rose-500">
                  <ClipboardList className="size-3.5" /> Analisa ringan
                </p>
                <p className="text-sm leading-relaxed">{advice.analisa}</p>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="mb-2 text-xs font-semibold text-rose-500">💡 Saran perawatan mandiri</p>
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

              <p className="text-[10px] leading-relaxed text-muted-foreground/70">
                ⚠️ Analisa ini dihasilkan AI sebagai dukungan umum dan <b>bukan diagnosis medis</b>.
                Jika gejala berlanjut atau memburuk dalam 2-3 hari, konsultasikan ke tenaga medis.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
