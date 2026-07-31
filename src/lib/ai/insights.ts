import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { buildLifeContext } from "@/lib/ai/life-context";
import { db } from "@/lib/db";
import { insights } from "@/lib/db/schema";

export const DailyBriefSchema = z.object({
  ringkasan: z.string(),
  perintah: z.string(),
  fokus: z.string(),
});

export type DailyBrief = z.infer<typeof DailyBriefSchema>;

export const WeeklyReportSchema = z.object({
  ringkasan: z.string(),
  korelasi: z.array(
    z.object({
      fiturA: z.string(),
      fiturB: z.string(),
      temuan: z.string(),
    })
  ),
  rekomendasi: z.array(z.string()),
});

export type WeeklyReport = z.infer<typeof WeeklyReportSchema>;

/** Simpan insight + feedback ke tabel (IN-03) */
export function saveInsight(input: {
  type: string;
  title: string;
  content: string;
  source?: string;
}) {
  return db
    .insert(insights)
    .values({
      type: input.type,
      title: input.title,
      content: input.content,
      source: input.source || "",
    })
    .returning()
    .get();
}

/** IN-01/02: Ringkasan harian + 1 perintah tindakan */
export async function dailyBrief(): Promise<{
  ok: boolean;
  data: DailyBrief | null;
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  const context = buildLifeContext();
  if (!context.trim() || context.trim() === "  (belum ada data)") {
    return { ok: true, data: null, source: "kosong" };
  }

  const heuristik = buildDailyHeuristic(context);

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Kamu adalah teman tandem (coach) yang tegas tapi hangat. Buat BRIEF HARIAN dari snapshot data LifeOS. " +
        "Output JSON: {\"ringkasan\":\"ringkasan <120 kata: kondisi hari ini per fitur penting\", " +
        "\"perintah\":\"🔴 SATU tindakan paling berdampak hari ini (spesifik, dengan waktu jika bisa)\", " +
        "\"fokus\":\"1 kalimat: apa yang harus dijaga/dihindari hari ini\"}. " +
        "Bahasa Indonesia, langsung, tanpa basa-basi.",
      context
    );

    const { text } = await generateText({ model, system, prompt: user, temperature: 0.4 });
    const parsed = parseJson(text, DailyBriefSchema);
    if (parsed) {
      saveInsight({ type: "harian", title: "Brief harian", content: parsed.ringkasan });
      return { ok: true, data: parsed, source: "ai" };
    }
    saveInsight({ type: "harian", title: "Brief harian", content: heuristik.ringkasan });
    return { ok: true, data: heuristik, source: "heuristik" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      saveInsight({ type: "harian", title: "Brief harian", content: heuristik.ringkasan });
      return { ok: true, data: heuristik, source: "heuristik" };
    }
    console.error("AI daily brief error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

/** IN-04/05: Laporan mingguan + korelasi lintas fitur */
export async function weeklyReport(): Promise<{
  ok: boolean;
  data: WeeklyReport | null;
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  const context = buildLifeContext();
  if (!context.trim()) {
    return { ok: true, data: null, source: "kosong" };
  }

  const heuristik = buildWeeklyHeuristic();

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Kamu adalah teman tandem LifeOS. Buat LAPORAN MINGGUAN dari snapshot data. " +
        "Output JSON: {\"ringkasan\":\"1-2 kalimat progres minggu ini (naik/turun per aspek)\", " +
        "\"korelasi\":[{\"fiturA\":\"fitur 1\",\"fiturB\":\"fitur 2\",\"temuan\":\"pola hubungan antar data + data pendukung\"}], " +
        "\"rekomendasi\":[\"2-3 rekomendasi untuk minggu depan\"]}. " +
        "Minimal 1 korelasi dengan data pendukung (mis. tidur rendah ↔ mood rendah, scroll tinggi ↔ produktivitas turun). " +
        "Bahasa Indonesia, jujur tapi membangun.",
      context
    );

    const { text } = await generateText({ model, system, prompt: user, temperature: 0.4 });
    const parsed = parseJson(text, WeeklyReportSchema);
    if (parsed) {
      saveInsight({ type: "mingguan", title: "Laporan mingguan", content: parsed.ringkasan });
      return { ok: true, data: parsed, source: "ai" };
    }
    saveInsight({ type: "mingguan", title: "Laporan mingguan", content: heuristik.ringkasan });
    return { ok: true, data: heuristik, source: "heuristik" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      saveInsight({ type: "mingguan", title: "Laporan mingguan", content: heuristik.ringkasan });
      return { ok: true, data: heuristik, source: "heuristik" };
    }
    console.error("AI weekly report error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

/** IN-06: Tanya jawab natural dengan data LifeOS */
export async function askLife(question: string): Promise<{
  ok: boolean;
  answer: string;
  source: "ai" | "heuristik";
}> {
  const context = buildLifeContext();
  const heuristik = `(mode offline) Berdasarkan data yang tersedia, jawaban lengkap butuh AI_API_KEY. Data saat ini:\n\n${context}`;

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Kamu adalah teman tandem yang punya akses penuh ke data LifeOS pengguna (snapshot di bawah). " +
        "Jawab pertanyaan pengguna dengan data NYATA dari snapshot — sebutkan angkanya. " +
        "Jika data tidak cukup, katakan jujur dan sarankan fitur LifeOS mana yang bisa mengisinya. " +
        "Bahasa Indonesia, ringkas, langsung.",
      `PERTANYAAN: ${question}\n\nDATA LIFEOS:\n${context}`
    );

    const { text } = await generateText({ model, system, prompt: user, temperature: 0.3 });
    saveInsight({ type: "tanya", title: question.slice(0, 60), content: text.slice(0, 300), source: "tanya" });
    return { ok: true, answer: text, source: "ai" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      return { ok: true, answer: heuristik, source: "heuristik" };
    }
    console.error("AI ask error:", err);
    return { ok: true, answer: "Gagal memproses pertanyaan — coba lagi.", source: "heuristik" };
  }
}

function buildDailyHeuristic(context: string): DailyBrief {
  const lines = context.split("\n");
  const todoLine = lines.find((l) => l.startsWith("  Deadline hari ini")) ?? "";
  const overdueLine = lines.find((l) => l.startsWith("  Terlambat")) ?? "";
  const sleepLine = lines.find((l) => l.startsWith("  Entri:")) ?? "";

  return {
    ringkasan: `Ringkasan singkat: ${todoLine.replace("  Deadline hari ini:", "deadline hari ini:")} | ${overdueLine.replace("  Terlambat:", "terlambat:")} | ${sleepLine.replace("  Entri:", "kesehatan:")}`,
    perintah: overdueLine.includes("tidak ada")
      ? "Tidak ada tugas terlambat — pertahankan ritme, kerjakan tugas berprioritas tinggi dulu."
      : `Selesaikan tugas terlambat hari ini: ${overdueLine.replace("  Terlambat:", "").trim()}`,
    fokus: "Fokus pada 1 tugas terpenting di pagi hari sebelum mengecek hal lain.",
  };
}

function buildWeeklyHeuristic(): WeeklyReport {
  return {
    ringkasan: "Progress minggu ini terangkum dari snapshot — lihat per-aspek di bawah.",
    korelasi: [
      { fiturA: "Kesehatan", fiturB: "Produktivitas", temuan: "Jika tidur < 7 jam, cek dampaknya ke penyelesaian tugas minggu ini." },
      { fiturA: "Keuangan", fiturB: "Kebiasaan", temuan: "Kategori pengeluaran teratas bisa menjadi indikator prioritas belanja." },
    ],
    rekomendasi: [
      "Tinjau 1-2 tugas terlambat dan pecah jadi langkah kecil.",
      "Pastikan tidur minimal 7 jam untuk menjaga mood & fokus.",
    ],
  };
}

function parseJson<T>(text: string, schema: z.ZodSchema<T>): T | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const parsed = schema.safeParse(JSON.parse(cleaned.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
