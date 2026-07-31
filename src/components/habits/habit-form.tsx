"use client";

import * as React from "react";
import { Loader2, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  onSaved: () => void;
}

/** Form daftar kebiasaan buruk + target + alasan (BH-01). */
export function HabitForm({ onSaved }: Props) {
  const [name, setName] = React.useState("");
  const [targetText, setTargetText] = React.useState("");
  const [alasan, setAlasan] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast.error("Nama kebiasaan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          category: "digital",
          targetText: targetText.trim(),
          alasan: alasan.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success(`Kebiasaan "${n}" dicatat — kamu bisa! 💪`);
      setName("");
      setTargetText("");
      setAlasan("");
      onSaved();
    } catch {
      toast.error("Gagal menyimpan kebiasaan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Target className="size-4 text-amber-500" />
        Kebiasaan yang mau dikurangi
      </p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Nama kebiasaan <span className="text-destructive">*</span>
          </p>
          <Input
            placeholder="mis. Scrolling sosmed sebelum tidur"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void save()}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Target pengurangan (opsional)
          </p>
          <Input
            placeholder="mis. dari ±3 jam → maksimal 1 jam/hari"
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Kenapa mau berhenti? (diingatkan AI saat lemah)
          </p>
          <Textarea
            placeholder="mis. Biar fokus ke keluarga dan pekerjaan"
            rows={2}
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            className="resize-none text-sm"
          />
        </div>

        <Button onClick={() => void save()} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {saving ? "Menyimpan…" : "Daftarkan kebiasaan"}
        </Button>
      </div>
    </div>
  );
}
