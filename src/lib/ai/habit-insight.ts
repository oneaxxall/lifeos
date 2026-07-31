import { generateText } from "ai";
import { z } from "zod";
import { asc, eq, and, gte, sql } from "drizzle-orm";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { db } from "@/lib/db";
import { badHabits, habitLogs } from "@/lib/db/schema";
import { computeHabitStats, type HabitLogSummary } from "@/lib/habit-stats";

export const HabitInsightSchema = z.object({
  pemicu: z.array(
    z.object({
      pola: z.string(),
      konteks: z.string(),
      saran: z.string(),
    })
  ),
  pengganti: z.array(
    z.object({
      pemicu: z.string(),
      gantiDengan: z.string(),
    })
  ),
  refleksi: z.string(),
  pesan: z.string(),
});

export type HabitInsight = z.infer<typeof HabitInsightSchema>;

interface HabitWithLogs {
  id: number;
  name: string;
  category: string;
  targetText: string | null;
  alasan: string | null;
  weeklyTarget: number | null;
  active: boolean;
  logs: HabitLogSummary[];
  stats: ReturnType<typeof computeHabitStats>;
}

/** Ambil SATU kebiasaan aktif + lognya (konteks AI per kebiasaan). */
export function getHabitWithLogs(habitId: number): HabitWithLogs | null {
  const h = db.select().from(badHabits).where(eq(badHabits.id, habitId)).get();
  if (!h || !h.active) return null;

  const logs = db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, h.id), gte(habitLogs.date, sql`date('now','-90 days')`)))
    .orderBy(asc(habitLogs.date))
    .all()
    .map((l) => ({
      date: l.date,
      status: l.status as "bersih" | "kambuh",
      jumlahKambuh: l.jumlahKambuh,
    }));

  return {
    id: h.id,
    name: h.name,
    category: h.category,
    targetText: h.targetText,
    alasan: h.alasan,
    weeklyTarget: h.weeklyTarget,
    active: h.active,
    logs,
    stats: computeHabitStats(logs),
  };
}

/**
 * Cari analisa tersimpan hari ini (per kebiasaan).
 * Jika ada → pakai (hemat LLM, hasil sama seperti sesi sebelumnya).
 */
function findStoredAnalysis(habitId: number): { data: HabitInsight; source: "ai" | "heuristik" } | null {
  const h = db.select().from(badHabits).where(eq(badHabits.id, habitId)).get();
  if (!h || !h.lastAnalysis || !h.lastAnalyzedAt) return null;
  try {
    const parsed = HabitInsightSchema.parse(JSON.parse(h.lastAnalysis));
    return { data: parsed, source: h.lastAnalysisSource === "heuristik" ? "heuristik" : "ai" };
  } catch {
    return null;
  }
}

/** Simpan hasil analisa ke DB (kolom last_analysis). */
function saveAnalysis(
  habitId: number,
  data: HabitInsight,
  source: "ai" | "heuristik"
) {
  db.update(badHabits)
    .set({
      lastAnalysis: JSON.stringify(data),
      lastAnalysisSource: source,
      lastAnalyzedAt: new Date().toISOString(),
    })
    .where(eq(badHabits.id, habitId))
    .run();
}

function buildContext(h: HabitWithLogs): string {
  const recent = h.logs
    .slice(-14)
    .map((l) => `${l.date}: ${l.status}${l.jumlahKambuh > 1 ? ` (${l.jumlahKambuh}x)` : ""}`)
    .join(", ");
  return [
    `Kebiasaan buruk: ${h.name}`,
    `Kategori: ${h.category}`,
    `Target pengurangan: ${h.targetText || "-"}`,
    `Alasan pengguna ingin berhenti: ${h.alasan || "-"}`,
    `Streak saat ini: ${h.stats.streak} hari bersih`,
    `Rekor terbaik: ${h.stats.longestStreak} hari`,
    `Kambuh minggu ini: ${h.stats.kambuhMingguIni}x`,
    `Total check-in: ${h.stats.totalBersih} bersih, ${h.stats.totalKambuh} kambuh`,
    `Log 14 hari terakhir: ${recent || "belum ada"}`,
  ].join("\n");
}

/** Heuristik per kebiasaan (tanpa LLM). */
function buildHeuristic(h: HabitWithLogs): HabitInsight {
  const insight: HabitInsight = {
    pemicu: [],
    pengganti: [],
    refleksi: "",
    pesan: "",
  };

  // Deteksi hari paling rawan kambuh
  const dayCount = new Map<string, number>();
  for (const l of h.logs) {
    if (l.status === "kambuh") {
      const d = new Date(l.date + "T00:00:00");
      const day = d.toLocaleDateString("id-ID", { weekday: "long" });
      dayCount.set(day, (dayCount.get(day) ?? 0) + 1);
    }
  }
  let rawan = "";
  let max = 0;
  for (const [day, c] of dayCount) {
    if (c > max) {
      max = c;
      rawan = day;
    }
  }

  if (h.stats.totalKambuh > 0) {
    insight.pemicu.push({
      pola: `${h.stats.totalKambuh}x kambuh dari ${h.stats.totalBersih + h.stats.totalKambuh} check-in`,
      konteks: rawan ? `Paling sering kambuh di hari ${rawan}.` : "Pemicu spesifik belum terlihat dari data.",
      saran: "Catat pemicu saat kambuh (waktu/mood/aktivitas) agar polanya terlihat.",
    });
  } else if (h.stats.totalBersih > 0) {
    insight.pemicu.push({
      pola: "Belum ada kambuh tercatat — pertahankan!",
      konteks: "Pemicu belum terlihat karena tidak ada kambuh dalam data.",
      saran: "Tetap catat check-in harian agar pola tetap terpantau.",
    });
  }

  insight.pengganti.push({
    pemicu: h.name,
    gantiDengan:
      h.category === "digital"
        ? "Aktifitas fisik 5 menit atau baca buku — kebutuhan istirahat otak terpenuhi tanpa efek buruk"
        : h.category === "konsumsi"
          ? "Minum air putih dulu, tunggu 10 menit — jika masih ingin, baru konsumsi dalam porsi kecil"
          : "Ganti dengan aktivitas ringan: jalan kaki, stretching, atau minum air",
  });

  if (h.stats.streak > 0) {
    insight.pesan = `${h.stats.streak} hari bersih beruntun dari ${h.name}. Teruskan!`;
  } else if (h.stats.totalKambuh > 0) {
    insight.pesan = `Tidak apa-apa kambuh — ingat alasannya ("${h.alasan || "berhenti"}") dan mulai lagi hari ini.`;
  } else {
    insight.pesan = "Mulai check-in hari ini — 5 detik saja cukup untuk membangun kesadaran.";
  }

  if (h.stats.totalBersih + h.stats.totalKambuh === 0) {
    insight.refleksi = "Belum ada check-in untuk kebiasaan ini. Mulai hari ini — 5 detik saja cukup.";
  } else {
    const total = h.stats.totalBersih + h.stats.totalKambuh;
    insight.refleksi = `Untuk "${h.name}": ${h.stats.totalBersih} hari bersih vs ${h.stats.totalKambuh} kambuh (${Math.round((h.stats.totalBersih / total) * 100)}% bersih). Tren jangka panjang yang penting, bukan kesempurnaan.`;
  }

  return insight;
}

/** BH-04/05: Analisa pemicu + saran pengganti + refleksi — PER KEBIASAAN. */
export async function analyzeHabit(habitId: number): Promise<{
  ok: boolean;
  data: HabitInsight | null;
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  const h = getHabitWithLogs(habitId);
  if (!h) {
    return { ok: true, data: null, source: "kosong" };
  }

  // Sudah dianalisa hari ini? Pakai hasil tersimpan — HEMAT LLM (1x/hari per kebiasaan)
  const stored = findStoredAnalysis(habitId);
  if (stored) {
    // Cek apakah analisa dibuat hari ini
    const hRow = db.select().from(badHabits).where(eq(badHabits.id, habitId)).get();
    const analyzedDate = hRow?.lastAnalyzedAt ? hRow.lastAnalyzedAt.slice(0, 10) : "";
    const today = new Date().toISOString().slice(0, 10);
    if (analyzedDate === today) {
      return { ok: true, data: stored.data, source: stored.source };
    }
  }

  const context = buildContext(h);
  const heuristik = buildHeuristic(h);

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      `Kamu adalah teman tandem disiplin yang HANGAT dan TIDAK PERNAH MENGHIAKIMI. ` +
        `Analisa SATU kebiasaan buruk pengguna: "${h.name}". Fokus HANYA pada kebiasaan ini, jangan bahas kebiasaan lain. ` +
        "Output JSON: {\"pemicu\":[{\"pola\":\"pola kambuh spesifik\",\"konteks\":\"kapan/kenapa rawan\",\"saran\":\"aksi waspada\"}], " +
        "\"pengganti\":[{\"pemicu\":\"pemicu\",\"gantiDengan\":\"alternatif sehat spesifik\"}], " +
        "\"refleksi\":\"1-2 kalimat tren mingguan jujur tapi membangun\", \"pesan\":\"satu kalimat penyemangat yang mengingatkan alasan awal\"}. " +
        "Bahasa Indonesia. Ingat alasan pengguna saat menyemangati. Fokus tren, bukan kesempurnaan.",
      context
    );
    const { text } = await generateText({ model, system, prompt: user, temperature: 0.4 });
    const parsed = parseHabitJson(text);
    if (parsed) {
      saveAnalysis(habitId, parsed, "ai");
      return { ok: true, data: parsed, source: "ai" };
    }
    saveAnalysis(habitId, heuristik, "heuristik");
    return { ok: true, data: heuristik, source: "heuristik" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      saveAnalysis(habitId, heuristik, "heuristik");
      return { ok: true, data: heuristik, source: "heuristik" };
    }
    console.error("AI habit insight error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

/** Parse JSON dari output LLM — toleran thd markdown fence. */
function parseHabitJson(text: string): HabitInsight | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    return HabitInsightSchema.parse(JSON.parse(cleaned.slice(start, end + 1)));
  } catch {
    return null;
  }
}
