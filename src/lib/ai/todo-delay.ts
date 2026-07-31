import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { db } from "@/lib/db";
import { todos } from "@/lib/db/schema";

const DAY_MS = 86_400_000;

export interface DelayedTodo {
  id: number;
  judul: string;
  daysOverdue: number;
  reason: string;
  area: string;
  dueDate: string;
  priority: string;
}

/** Deteksi tugas tertunda — overdue aktif & selesai terlambat */
export function detectDelayedTodos(): DelayedTodo[] {
  const rows = db.select().from(todos).all();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const delayed: DelayedTodo[] = [];

  for (const t of rows) {
    // Tugas aktif yang lewat tenggat
    if (t.status !== "done" && t.dueDate) {
      const due = new Date(t.dueDate + "T00:00:00");
      if (!isNaN(due.getTime()) && due < today) {
        const days = Math.floor((today.getTime() - due.getTime()) / DAY_MS);
        delayed.push({
          id: t.id,
          judul: t.title,
          daysOverdue: days,
          reason: `Terlambat ${days} hari dari tenggat ${t.dueDate}.`,
          area: t.area || "",
          dueDate: t.dueDate,
          priority: t.priority || "sedang",
        });
      }
    }

    // Selesai tapi jauh setelah tenggat (selesai terlambat > 7 hari)
    if (t.status === "done" && t.dueDate && t.completedAt) {
      const due = new Date(t.dueDate + "T00:00:00");
      const done = new Date(t.completedAt);
      if (!isNaN(due.getTime()) && !isNaN(done.getTime())) {
        const daysLate = Math.floor((done.getTime() - due.getTime()) / DAY_MS);
        if (daysLate > 7) {
          delayed.push({
            id: t.id,
            judul: t.title,
            daysOverdue: daysLate,
            reason: `Diselesaikan ${daysLate} hari setelah tenggat — pola penundaan.`,
            area: t.area || "",
            dueDate: t.dueDate,
            priority: t.priority || "sedang",
          });
        }
      }
    }
  }

  return delayed.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export const DelayInsightSchema = z.object({
  pola: z.string(),
  saran: z.string(),
});

export type DelayInsight = z.infer<typeof DelayInsightSchema>;

/**
 * Ringkasan pola penundaan AI (TDO-05).
 * Fallback heuristik jika API key belum ada.
 */
export async function analyzeDelays(): Promise<{
  ok: boolean;
  data: { delayed: DelayedTodo[]; insight: DelayInsight | null };
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  const delayed = detectDelayedTodos();
  if (delayed.length === 0) {
    return { ok: true, data: { delayed: [], insight: null }, source: "kosong" };
  }

  const heuristik: DelayInsight = {
    pola: `${delayed.length} tugas tertunda; terlama ${delayed[0].daysOverdue} hari.`,
    saran: "Selesaikan yang terlama dulu — atau perbarui tenggatnya agar realistis.",
  };

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "menyuruh" });
    const user = buildUserPrompt(
      "Analisis pola penundaan dari daftar tugas tertunda ini. " +
        "Beri 'pola' (pola keterlambatan yang terlihat, 1-2 kalimat) dan 'saran' (1 tindakan konkret). " +
        "Output JSON: {\"pola\":\"...\", \"saran\":\"...\"}",
      JSON.stringify(
        delayed.map((d) => ({
          judul: d.judul,
          terlambatHari: d.daysOverdue,
          area: d.area,
        })),
        null,
        2
      )
    );

    const { text } = await generateText({ model, system, prompt: user, temperature: 0.3 });
    const parsed = parseInsightJson(text);
    if (parsed) {
      return { ok: true, data: { delayed, insight: parsed }, source: "ai" };
    }
    return { ok: true, data: { delayed, insight: heuristik }, source: "heuristik" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      return { ok: true, data: { delayed, insight: heuristik }, source: "heuristik" };
    }
    console.error("AI todo-delay error:", err);
    return { ok: true, data: { delayed, insight: heuristik }, source: "heuristik" };
  }
}

function parseInsightJson(text: string): DelayInsight | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const parsed = DelayInsightSchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
