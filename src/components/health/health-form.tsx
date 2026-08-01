"use client";

import * as React from "react";
import {
  Bed,
  Footprints,
  GlassWater,
  HeartPulse,
  Scale,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  onSaved: () => void;
}

/** Form input kesehatan cepat (< 15 detik) — HLT-01. Upsert per tanggal. */
export function HealthForm({ onSaved }: Props) {
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = React.useState("");
  const [sleep, setSleep] = React.useState("");
  const [exercise, setExercise] = React.useState("");
  const [steps, setSteps] = React.useState("");
  const [water, setWater] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/health/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          weightKg: weight ? Number(weight) : undefined,
          sleepHours: sleep ? Number(sleep) : undefined,
          exerciseMinutes: exercise ? Number(exercise) : undefined,
          steps: steps ? Number(steps) : undefined,
          waterGlasses: water ? Number(water) : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Entri kesehatan disimpan 💚");
      setWeight("");
      setSleep("");
      setExercise("");
      setSteps("");
      setWater("");
      onSaved();
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "h-9 pl-8 text-sm tabular-nums";

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <HeartPulse className="size-4 text-emerald-600 dark:text-emerald-400" />
        Catat kesehatan hari ini
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">Tanggal</p>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">Berat (kg)</p>
          <div className="relative">
            <Scale className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number" inputMode="decimal" step="0.1" min={0}
              placeholder="72.5" value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">Tidur (jam)</p>
          <div className="relative">
            <Bed className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number" inputMode="decimal" step="0.5" min={0} max={16}
              placeholder="7.5" value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">Olahraga (menit)</p>
          <div className="relative">
            <Dumbbell className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number" inputMode="numeric" min={0}
              placeholder="45" value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">Langkah</p>
          <div className="relative">
            <Footprints className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number" inputMode="numeric" min={0}
              placeholder="8000" value={steps}
              onChange={(e) => setSteps(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">Air (gelas)</p>
          <div className="relative">
            <GlassWater className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number" inputMode="numeric" min={0} max={20}
              placeholder="8" value={water}
              onChange={(e) => setWater(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button onClick={() => void save()} disabled={saving} className="gap-2">
          <HeartPulse className="size-4" /> {saving ? "Menyimpan…" : "Simpan entri"}
        </Button>
      </div>
    </div>
  );
}
