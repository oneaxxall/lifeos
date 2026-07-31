"use client";

import * as React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { Activity } from "lucide-react";

export interface HealthEntryItem {
  id: number;
  date: string;
  weightKg: number | null;
  sleepHours: number | null;
  exerciseMinutes: number | null;
  steps: number | null;
  waterGlasses: number | null;
  notes: string;
}

interface Props {
  entries: HealthEntryItem[];
}

/** Tren kesehatan — chart garis per metrik (HLT-02). */
export function HealthTrends({ entries }: Props) {
  if (entries.length === 0) return null;

  const data = [...entries]
    .reverse()
    .map((e) => ({
      tanggal: e.date.slice(5), // MM-DD
      Berat: e.weightKg,
      Tidur: e.sleepHours,
      Olahraga: e.exerciseMinutes,
      Langkah: e.steps ? Math.round(e.steps / 1000) : undefined, // ribuan
    }));

  const hasWeight = data.some((d) => d.Berat);
  const hasSleep = data.some((d) => d.Tidur);
  const hasExercise = data.some((d) => d.Olahraga);

  if (!hasWeight && !hasSleep && !hasExercise) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Activity className="size-4 text-emerald-600 dark:text-emerald-400" /> Tren kesehatan
        <span className="text-[10px] font-normal text-muted-foreground">(langkah dalam ribuan)</span>
      </p>

      <div className="h-[260px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" className="min-w-0">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="tanggal" tick={{ fontSize: 10 }} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {hasWeight && (
              <Line type="monotone" dataKey="Berat" stroke="#0D9488" strokeWidth={2} dot={{ r: 2 }} connectNulls />
            )}
            {hasSleep && (
              <Line type="monotone" dataKey="Tidur" stroke="#6366F1" strokeWidth={2} dot={{ r: 2 }} connectNulls />
            )}
            {hasExercise && (
              <Line type="monotone" dataKey="Olahraga" stroke="#F59E0B" strokeWidth={2} dot={{ r: 2 }} connectNulls />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
