import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { computeSpiritualStatsServer, getSpiritualGoals, listSpiritualAsc } from "@/lib/db/spiritual-repo";

export const SpiritualInsightSchema = z.object({
  konsistensi: z.string(),
  kendor: z.string(),
  refleksi: z.string(),
  target: z.string(),
  ringkasan: z.string(),
});

export type SpiritualInsight = z.infer<typeof SpiritualInsightSchema>;

/** Konteks AI: stats + 2 minggu entri + target */
function buildSpiritualContext(): string {
  const entries = listSpiritualAsc(30);
  const stats = computeSpiritualStatsServer(entries);
  const goals = getSpiritualGoals();

  const entryLines = entries
    .slice(-14)
    .map((e) => {
      let rituals: Record<string, boolean> = {};
      try {
        rituals = JSON.parse(e.rituals);
      } catch {
        /* ignore */
      }
      const done = Object.entries(rituals)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(",");
      return `- ${e.date}: ${done || "—"}${e.quality ? ` (kualitas ${e.quality}/5)` : ""}${e.reflection ? ` | refleksi: ${e.reflection.slice(0, 60)}` : ""}`;
    })
    .join("\n");

  const goalLines = goals
    ? `Target khatam: ${goals.quranKhatamJuz || "-"} juz | Baca Quran: ${goals.weeklyReadMinutes || "-"} menit/minggu`
    : "(belum ada target)";

  return [
    `STATS: streak ${stats.streak} hari | terpanjang ${stats.longestStreak} | aktif ${stats.activeDays}/${stats.totalDays} hari | komplesi 7 hari ${stats.weekCompletion}%`,
    ``,
    `ENTRI 2 MINGGU:`,
    entryLines || "  (belum ada data)",
    ``,
    goalLines,
  ].join("\n");
}

/** Analisa spiritual AI — konsistensi, peringatan kendor, target (SPI-02/03/04). Fallback heuristik. */
export async function analyzeSpiritual(): Promise<{
  ok: boolean;
  data: SpiritualInsight | null;
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  const entries = listSpiritualAsc(30);
  if (entries.length === 0) {
    return { ok: true, data: null, source: "kosong" };
  }

  // Heuristik lokal tanpa LLM
  const heuristik = buildHeuristic(entries);

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Kamu adalah pengingat lembut yang menghormati kesakralan spiritual — BUKAN penghakim dan BUKAN pengajar agama. " +
        "Analisa konsistensi ritual pengguna. Output JSON: " +
        "{\"konsistensi\":\"pujian jujur + pola terbaik\", " +
        "\"kendor\":\"peringatan lembut jika ada penurunan/2+ hari kosong, tanpa menghakimi; jika konsisten, beri afirmasi\", " +
        "\"refleksi\":\"pertanyaan refleksi singkat yang menenangkan\", " +
        "\"target\":\"progress target (khatam juz / baca mingguan) + dorongan\", " +
        "\"ringkasan\":\"1 kalimat penenang\"}. " +
        "Jangan mengajarkan tafsir agama — cukup dukung konsistensi. Bahasa Indonesia, hangat, panggil 'Kamu'.",
      buildSpiritualContext()
    );

    const { text } = await generateText({ model, system, prompt: user, temperature: 0.4 });
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
    console.error("AI spiritual error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

function buildHeuristic(entries: ReturnType<typeof listSpiritualAsc>): SpiritualInsight {
  const stats = computeSpiritualStatsServer(entries);
  const goals = getSpiritualGoals();

  // Deteksi kendor: 2+ hari terakhir (dari tanggal aktif terakhir) kosong
  let kendor = "";
  if (stats.streak === 0 && stats.activeDays > 0) {
    const last = stats.lastActiveDate;
    const daysGap = last
      ? Math.max(0, Math.round((Date.now() - new Date(last + "T00:00:00").getTime()) / 86400000) - 1)
      : 0;
    kendor =
      daysGap >= 2
        ? `${daysGap} hari tanpa pencatatan ritual — tidak apa-apa, yang penting kembali. Mulai dari 1 ritual kecil hari ini.`
        : "Belum tercatat hari ini — sempatkan 1 ritual kecil, niat baik sudah dihitung. 🙂";
  } else {
    kendor = "Konsisten! Pertahankan ritme yang sedang berjalan.";
  }

  const targetLine =
    goals?.quranKhatamJuz
      ? `Target khatam ${goals.quranKhatamJuz} juz — 30 juz/30 hari ≈ 1 juz/hari untuk 1 bulan, atau sesuaikan dengan targetmu.`
      : goals?.weeklyReadMinutes
        ? `Target baca ${goals.weeklyReadMinutes} menit/minggu — bagi rata ${Math.ceil((goals.weeklyReadMinutes || 0) / 7)} menit/hari.`
        : "Atur target khatam/baca Quran untuk melihat progress.";

  return {
    konsistensi:
      stats.activeDays > 0
        ? `Streak ${stats.streak} hari (terpanjang ${stats.longestStreak}), komplesi 7 hari ${stats.weekCompletion}%.`
        : "Mulai hari ini — setiap perjalanan dimulai dari satu langkah.",
    kendor,
    refleksi: "Apa satu hal dari ibadah hari ini yang terasa paling dekat dengan hatimu?",
    target: targetLine,
    ringkasan: "Mode offline — set AI_API_KEY untuk analisa lebih dalam.",
  };
}

function parseInsightJson(text: string): SpiritualInsight | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const parsed = SpiritualInsightSchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
