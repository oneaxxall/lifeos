import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { timeSummary } from "@/lib/db/time-repo";

export const TimeInsightSchema = z.object({
  pemborosan: z.array(
    z.object({
      kategori: z.string(),
      durasiMenit: z.number(),
      saran: z.string(),
    })
  ),
  jamPuncak: z.string(),
  saranJadwal: z.array(z.string()),
  mingguan: z.object({
    produktifMenit: z.number(),
    buangMenit: z.number(),
    tren: z.string(),
    perbaikan: z.string(),
  }),
  ringkasan: z.string(),
});

export type TimeInsight = z.infer<typeof TimeInsightSchema>;

/** Konteks AI: ringkasan 7 hari + aktivitas per kategori */
function buildTimeContext(): string {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const summary = timeSummary(weekAgo, today);

  const catLines = summary.kategori
    .map((k) => `  - ${k.nama} (${k.value}): ${k.menit} menit`)
    .join("\n");

  return [
    `Rentang: ${weekAgo} s/d ${today}`,
    `Total tercatat: ${summary.totalMenit} menit`,
    `Produktif: ${summary.produktifMenit} menit`,
    `Netral: ${summary.netralMenit} menit`,
    `Buang waktu: ${summary.buangMenit} menit`,
    `Per kategori:`,
    catLines || "  (belum ada data)",
  ].join("\n");
}

/** Analisa waktu AI (TIM-05/06/07). Fallback heuristik jika API key belum ada. */
export async function analyzeTime(): Promise<{
  ok: boolean;
  data: TimeInsight | null;
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const summary = timeSummary(weekAgo, today);

  if (summary.totalMenit === 0) {
    return { ok: true, data: null, source: "kosong" };
  }

  // Heuristik lokal tanpa LLM
  const heuristik = buildHeuristic(summary);

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Analisa penggunaan waktu 7 hari terakhir. Output JSON: " +
        "{\"pemborosan\":[{\"kategori\":\"...\",\"durasiMenit\":0,\"saran\":\"...\"}], " +
        "\"jamPuncak\":\"deskripsi jam produktif berdasarkan pola aktivitas\", " +
        "\"saranJadwal\":[\"saran jadwal 1\",\"saran jadwal 2\"], " +
        "\"mingguan\":{\"produktifMenit\":0,\"buangMenit\":0,\"tren\":\"...\",\"perbaikan\":\"...\"}, " +
        "\"ringkasan\":\"1 kalimat\"}. " +
        "Maks 3 item pemborosan. Saran harus konkret dengan angka (jam/menit).",
      buildTimeContext()
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
    console.error("AI time error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

function buildHeuristic(
  summary: ReturnType<typeof timeSummary>
): TimeInsight {
  const pemborosan = summary.kategori
    .filter((k) => k.value === "buang")
    .slice(0, 3)
    .map((k) => ({
      kategori: k.nama,
      durasiMenit: k.menit,
      saran: `Kurangi ${Math.round(k.menit / 7)} menit/hari dari "${k.nama}" — target 30 menit/hari.`,
    }));

  const buangPct =
    summary.totalMenit > 0 ? Math.round((summary.buangMenit / summary.totalMenit) * 100) : 0;

  return {
    pemborosan,
    jamPuncak: "Data belum cukup untuk deteksi jam puncak — catat aktivitas lebih banyak.",
    saranJadwal: [
      "Blok 09.00–11.00 untuk deep work (umumnya jam paling fokus).",
      "Jadwalkan meeting/admin di luar jam deep work.",
    ],
    mingguan: {
      produktifMenit: summary.produktifMenit,
      buangMenit: summary.buangMenit,
      tren: `${summary.produktifMenit} menit produktif vs ${summary.buangMenit} menit buang (${buangPct}%) minggu ini.`,
      perbaikan: "Kurangi satu kategori buang waktu agar fokus naik.",
    },
    ringkasan: "Mode offline — set AI_API_KEY untuk analisa mendalam.",
  };
}

function parseInsightJson(text: string): TimeInsight | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const parsed = TimeInsightSchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
