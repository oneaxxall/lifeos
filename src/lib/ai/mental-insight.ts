import { generateText } from "ai";
import { z } from "zod";
import { eq, gte } from "drizzle-orm";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { db } from "@/lib/db";
import { healthEntries, todos, financeTransactions } from "@/lib/db/schema";
import { listMoodsAsc } from "@/lib/db/mental-repo";

export const MentalInsightSchema = z.object({
  pola: z.string(),
  korelasi: z.array(
    z.object({
      faktor: z.string(),
      temuan: z.string(),
    })
  ),
  saran: z.string(),
  butuhProfesional: z.boolean(),
  ringkasan: z.string(),
});

export type MentalInsight = z.infer<typeof MentalInsightSchema>;

const REFLECTION_PROMPTS = [
  "Apa yang paling kamu syukuri hari ini?",
  "Apa satu hal yang berjalan baik minggu ini?",
  "Apa yang menguras energimu akhir-akhir ini?",
  "Kalau bisa mengulang satu momen hari ini, apa yang akan kamu ubah?",
  "Hal kecil apa yang membuatmu tersenyum hari ini?",
];

/** Prompt refleksi acak untuk jurnal (MEN-02) */
export function getRandomReflectionPrompt(): string {
  return REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)];
}

/** Konteks AI: mood 3 minggu + tidur + tugas selesai + pengeluaran */
function buildMentalContext(): string {
  const from = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10);

  const moods = listMoodsAsc().filter((m) => m.date >= from);
  const moodLines = moods
    .map((m) => `- ${m.date}: mood ${m.mood}/5${m.note ? ` (${m.note.slice(0, 80)})` : ""}`)
    .join("\n");

  const sleeps = db
    .select()
    .from(healthEntries)
    .where(gte(healthEntries.date, from))
    .all();
  const sleepLines = sleeps
    .filter((h) => h.sleepHours)
    .map((h) => `- ${h.date}: tidur ${h.sleepHours}j${h.exerciseMinutes ? `, olahraga ${h.exerciseMinutes}m` : ""}`)
    .join("\n");

  const doneTodos = db
    .select()
    .from(todos)
    .where(eq(todos.status, "done"))
    .all()
    .filter((t) => t.completedAt && t.completedAt.slice(0, 10) >= from);
  const todoLines = doneTodos.map((t) => `- ${t.completedAt?.slice(0, 10)}: selesai "${t.title}"`).join("\n");

  const spends = db
    .select()
    .from(financeTransactions)
    .where(eq(financeTransactions.type, "keluar"))
    .all()
    .filter((f) => f.date >= from);
  const spendLines = spends
    .map((f) => `- ${f.date}: keluar Rp${f.amount}${f.description ? ` (${f.description.slice(0, 50)})` : ""}`)
    .slice(0, 30)
    .join("\n");

  return [
    `MOOD 3 MINGGU TERAKHIR:`,
    moodLines || "  (belum ada data)",
    ``,
    `KESEHATAN:`,
    sleepLines || "  (belum ada data)",
    ``,
    `TUGAS SELESAI:`,
    todoLines || "  (tidak ada)",
    ``,
    `PENGELUARAN:`,
    spendLines || "  (tidak ada)",
  ].join("\n");
}

/** Analisa mental AI (MEN-03/04/05). Fallback heuristik jika API key belum ada. */
export async function analyzeMental(): Promise<{
  ok: boolean;
  data: MentalInsight | null;
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  const moods = listMoodsAsc();
  if (moods.length < 2) {
    return { ok: true, data: null, source: "kosong" };
  }

  // Heuristik lokal tanpa LLM
  const heuristik = buildHeuristic(moods);

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Analisa kesehatan mental dari data mood & konteks. Output JSON: " +
        "{\"pola\":\"pola mood yang terlihat (hari/waktu/konteks)\", " +
        "\"korelasi\":[{\"faktor\":\"tidur/tugas/keuangan\",\"temuan\":\"...\"}], " +
        "\"saran\":\"1 tindakan dukungan konkret\", " +
        "\"butuhProfesional\":false, " +
        "\"ringkasan\":\"1 kalimat\"}. " +
        "PENTING: ini dukungan umum, BUKAN diagnosis. Jika mood rata-rata turun atau ada pola negatif berkepanjangan, set butuhProfesional=true dan sarankan konsultasi profesional.",
      buildMentalContext()
    );

    const { text } = await generateText({ model, system, prompt: user, temperature: 0.3 });
    const parsed = parseInsightJson(text);
    if (parsed) {
      return { ok: true, data: parsed, source: "ai" };
    }
    return { ok: true, data: heuristik, source: "heuristik" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      return { ok: true, data: heuristik, source: "heuristik" };
    }
    console.error("AI mental error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

function buildHeuristic(moods: ReturnType<typeof listMoodsAsc>): MentalInsight {
  const recent = moods.slice(-7);
  const avg = moods.reduce((s, m) => s + m.mood, 0) / moods.length;
  const recentAvg = recent.reduce((s, m) => s + m.mood, 0) / recent.length;
  const trendDown = recentAvg < avg - 0.5;
  const veryLow = recent.filter((m) => m.mood <= 2).length;

  return {
    pola: `Mood rata-rata ${avg.toFixed(1)}/5 (7 hari terakhir: ${recentAvg.toFixed(1)}).`,
    korelasi: [
      { faktor: "Mood", temuan: `Rata-rata ${avg.toFixed(1)} dari 5 — ${avg >= 3.5 ? "cenderung baik" : avg >= 2.5 ? "fluktuatif" : "cenderung rendah"}.` },
      {
        faktor: "Tren",
        temuan: trendDown
          ? "Tren 7 hari terakhir menurun dibanding rata-rata."
          : "Tren 7 hari terakhir stabil atau membaik.",
      },
    ],
    saran:
      veryLow >= 2
        ? "Mood rendah beberapa hari — pertimbangkan konsultasi profesional jika berlanjut."
        : trendDown
          ? "Coba jadwalkan aktivitas yang kamu nikmati — dan pastikan tidur cukup."
          : "Pertahankan rutinitas positif yang sedang berjalan.",
    butuhProfesional: veryLow >= 3 || trendDown && avg < 2.5,
    ringkasan: "Mode offline — set AI_API_KEY untuk korelasi mendalam.",
  };
}

function parseInsightJson(text: string): MentalInsight | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const parsed = MentalInsightSchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
