import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { getHealthGoals, listHealthEntriesAsc } from "@/lib/db/health-repo";

export const HealthInsightSchema = z.object({
  tren: z.string(),
  rekomendasi: z.array(z.string()),
  kebiasaanBuruk: z.array(
    z.object({
      pola: z.string(),
      dampak: z.string(),
      saran: z.string(),
    })
  ),
  ringkasan: z.string(),
});

export type HealthInsight = z.infer<typeof HealthInsightSchema>;

/** Konteks AI: 4 minggu entri + target */
function buildHealthContext(): string {
  const entries = listHealthEntriesAsc(90);
  const goals = getHealthGoals();

  const entryLines = entries
    .map((e) => {
      const parts = [`- ${e.date}`];
      if (e.weightKg) parts.push(`berat:${e.weightKg}kg`);
      if (e.sleepHours) parts.push(`tidur:${e.sleepHours}j`);
      if (e.exerciseMinutes) parts.push(`olahraga:${e.exerciseMinutes}m`);
      if (e.steps) parts.push(`langkah:${e.steps}`);
      if (e.waterGlasses) parts.push(`air:${e.waterGlasses} gelas`);
      return parts.join(" | ");
    })
    .join("\n");

  const goalLines = goals
    ? [
        `Target berat: ${goals.goalWeightKg || "-"}kg`,
        `Olahraga/minggu: ${goals.exercisePerWeekMinutes || "-"} menit`,
        `Tidur: ${goals.sleepTargetHours || "-"} jam`,
        `Langkah/hari: ${goals.dailyStepsTarget || "-"}`,
      ].join("\n")
    : "(belum ada target)";

  return [`ENTRI 4 MINGGU TERAKHIR:`, entryLines || "  (belum ada data)", ``, `TARGET:`, goalLines].join("\n");
}

/** Analisa kesehatan AI (HLT-04/05/06). Fallback heuristik jika API key belum ada. */
export async function analyzeHealth(): Promise<{
  ok: boolean;
  data: HealthInsight | null;
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  const entries = listHealthEntriesAsc(30);
  if (entries.length === 0) {
    return { ok: true, data: null, source: "kosong" };
  }

  // Heuristik lokal tanpa LLM
  const heuristik = buildHeuristic(entries);

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Analisa kesehatan 4 minggu terakhir. Output JSON: " +
        "{\"tren\":\"ringkasan tren berat/tidur/olahraga\", " +
        "\"rekomendasi\":[\"2-3 rekomendasi terukur dengan angka\"], " +
        "\"kebiasaanBuruk\":[{\"pola\":\"...\",\"dampak\":\"...\",\"saran\":\"...\"}], " +
        "\"ringkasan\":\"1 kalimat\"}. " +
        "Bukan diagnosis medis — dukungan gaya hidup umum. " +
        "Jika ada tren negatif berkepanjangan (mis. tidur <6j terus), sarankan konsultasi profesional.",
      buildHealthContext()
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
    console.error("AI health error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

function buildHeuristic(entries: ReturnType<typeof listHealthEntriesAsc>): HealthInsight {
  const recent = entries.slice(-7);
  const avgSleep = recent.filter((e) => e.sleepHours).reduce((s, e) => s + (e.sleepHours || 0), 0) /
    Math.max(1, recent.filter((e) => e.sleepHours).length);
  const avgExercise = recent.filter((e) => e.exerciseMinutes).reduce((s, e) => s + (e.exerciseMinutes || 0), 0) /
    Math.max(1, recent.filter((e) => e.exerciseMinutes).length);
  const latestWeight = [...entries].reverse().find((e) => e.weightKg)?.weightKg ?? 0;
  const firstWeight = entries.find((e) => e.weightKg)?.weightKg ?? 0;

  const kebiasaanBuruk: { pola: string; dampak: string; saran: string }[] = [];
  if (avgSleep > 0 && avgSleep < 6) {
    kebiasaanBuruk.push({
      pola: `Tidur rata-rata ${avgSleep.toFixed(1)} jam`,
      dampak: "Kurang dari 7 jam bisa menurunkan fokus & imunitas.",
      saran: "Target 7-8 jam — matikan layar 30 menit sebelum tidur.",
    });
  }
  if (avgExercise < 30) {
    kebiasaanBuruk.push({
      pola: `Olahraga rata-rata ${avgExercise.toFixed(0)} menit/hari`,
      dampak: "Di bawah rekomendasi aktivitas fisik harian.",
      saran: "Mulai 20 menit jalan cepat — konsisten lebih penting dari intensitas.",
    });
  }

  return {
    tren: `Berat: ${firstWeight || "-"}kg → ${latestWeight || "-"}kg | Tidur rata-rata ${avgSleep.toFixed(1)}j | Olahraga rata-rata ${avgExercise.toFixed(0)}m/hari.`,
    rekomendasi: [
      avgSleep < 7 ? `Tambah tidur ke minimal 7 jam — naikkan ${(7 - avgSleep).toFixed(1)} jam/malam.` : "Pertahankan pola tidur yang baik.",
      avgExercise < 30 ? "Tambah aktivitas fisik ke 30 menit/hari." : "Pertahankan rutinitas olahraga.",
    ],
    kebiasaanBuruk,
    ringkasan: "Mode offline — set AI_API_KEY untuk analisa mendalam.",
  };
}

function parseInsightJson(text: string): HealthInsight | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const parsed = HealthInsightSchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
