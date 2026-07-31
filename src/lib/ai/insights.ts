import { generateText } from "ai";
import { z } from "zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
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

/**
 * Cari brief harian tersimpan hari ini — hindari generate ulang (1x/hari).
 * Tangguh terhadap row lama (plain text) — coba beberapa row terakhir.
 */
function findStoredDailyBrief(): { data: DailyBrief; source: "ai" | "heuristik" } | null {
  const rows = db
    .select()
    .from(insights)
    .where(and(eq(insights.type, "harian"), eq(insights.date, sql`date('now')`)))
    .orderBy(desc(insights.id))
    .limit(5)
    .all();
  for (const row of rows) {
    const parsed = parseJson(row.content, DailyBriefSchema);
    if (parsed) {
      return { data: parsed, source: row.source === "heuristik" ? "heuristik" : "ai" };
    }
  }
  return null;
}

/**
 * Cari laporan mingguan tersimpan (7 hari terakhir) — hindari generate ulang (1x/minggu).
 */
function findStoredWeeklyReport(): { data: WeeklyReport; source: "ai" | "heuristik" } | null {
  const row = db
    .select()
    .from(insights)
    .where(and(eq(insights.type, "mingguan"), gte(insights.date, sql`date('now','-6 days')`)))
    .orderBy(desc(insights.id))
    .limit(1)
    .get();
  if (!row) return null;
  const parsed = parseJson(row.content, WeeklyReportSchema);
  if (!parsed) return null;
  return { data: parsed, source: row.source === "heuristik" ? "heuristik" : "ai" };
}

/**
 * Cari brief harian terakhir (hari apa pun) — untuk tampilan instan
 * saat brief hari ini belum dibuat (stale-while-revalidate).
 */
function findLastDailyBrief(): { data: DailyBrief; source: "ai" | "heuristik" } | null {
  const rows = db
    .select()
    .from(insights)
    .where(eq(insights.type, "harian"))
    .orderBy(desc(insights.id))
    .limit(5)
    .all();
  for (const row of rows) {
    const parsed = parseJson(row.content, DailyBriefSchema);
    if (parsed) {
      return { data: parsed, source: row.source === "heuristik" ? "heuristik" : "ai" };
    }
  }
  return null;
}

/** Generate brief harian (LLM/heuristik) + simpan ke DB. */
async function generateDailyBrief(context: string): Promise<{
  data: DailyBrief;
  source: "ai" | "heuristik";
}> {
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
      saveInsight({ type: "harian", title: "Brief harian", content: JSON.stringify(parsed), source: "ai" });
      return { data: parsed, source: "ai" };
    }
    saveInsight({ type: "harian", title: "Brief harian", content: JSON.stringify(heuristik), source: "heuristik" });
    return { data: heuristik, source: "heuristik" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      saveInsight({ type: "harian", title: "Brief harian", content: JSON.stringify(heuristik), source: "heuristik" });
      return { data: heuristik, source: "heuristik" };
    }
    console.error("AI daily brief error:", err);
    return { data: heuristik, source: "heuristik" };
  }
}

/** IN-01/02: Ringkasan harian + 1 perintah tindakan */
export async function dailyBrief(): Promise<{
  ok: boolean;
  data: DailyBrief | null;
  source: "ai" | "heuristik" | "kosong";
  /** true jika data berasal dari brief KEMARIN (hari ini belum dibuat) */
  stale?: boolean;
  error?: string;
}> {
  // Sudah dibuat hari ini? Langsung pakai yang tersimpan — HEMAT LLM (1x/hari)
  const stored = findStoredDailyBrief();
  if (stored) {
    return { ok: true, data: stored.data, source: stored.source };
  }

  // Belum dibuat hari ini: tampilkan brief terakhir (instan) + generate di background
  const last = findLastDailyBrief();
  if (last) {
    const context = buildLifeContext();
    if (context.trim() && context.trim() !== "  (belum ada data)") {
      // Generate untuk hari ini TANPA memblokir response (fire-and-forget)
      void generateDailyBrief(context).catch(() => {});
    }
    return { ok: true, data: last.data, source: last.source, stale: true };
  }

  // Belum pernah ada brief: generate langsung (bisa lambat pertama kali)
  const context = buildLifeContext();
  if (!context.trim() || context.trim() === "  (belum ada data)") {
    return { ok: true, data: null, source: "kosong" };
  }
  const fresh = await generateDailyBrief(context);
  return { ok: true, data: fresh.data, source: fresh.source };
}

/** IN-04/05: Laporan mingguan + korelasi lintas fitur */
export async function weeklyReport(): Promise<{
  ok: boolean;
  data: WeeklyReport | null;
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  // Sudah dibuat minggu ini? Langsung pakai yang tersimpan — HEMAT LLM (1x/minggu)
  const stored = findStoredWeeklyReport();
  if (stored) {
    return { ok: true, data: stored.data, source: stored.source };
  }

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
      saveInsight({ type: "mingguan", title: "Laporan mingguan", content: JSON.stringify(parsed), source: "ai" });
      return { ok: true, data: parsed, source: "ai" };
    }
    saveInsight({ type: "mingguan", title: "Laporan mingguan", content: JSON.stringify(heuristik), source: "heuristik" });
    return { ok: true, data: heuristik, source: "heuristik" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      saveInsight({ type: "mingguan", title: "Laporan mingguan", content: JSON.stringify(heuristik), source: "heuristik" });
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
