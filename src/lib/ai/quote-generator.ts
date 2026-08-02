import { generateText } from "ai";
import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { db } from "@/lib/db";
import { dailyQuotes, moodEntries, activities } from "@/lib/db/schema";
import { PERSONALITIES, PERSONA_GUIDE, type Personality } from "@/lib/quote-personalities";

export const QuoteSchema = z.object({
  content: z.string(),
  author: z.string().optional().default(""),
  topic: z.string().optional(),
});

export type Quote = z.infer<typeof QuoteSchema>;

/** Quote heuristik (tanpa LLM) — per topik. */
function buildHeuristicQuotes(count: number, topic: string): Quote[] {
  const pools: Record<string, Quote[]> = {
    motivasi: [
      { content: "Kemajuan kecil setiap hari menghasilkan hasil yang luar biasa.", author: "LifeOS" },
      { content: "Kamu tidak harus sempurna, kamu hanya perlu mulai.", author: "LifeOS" },
      { content: "Satu langkah hari ini lebih berharga dari seribu rencana besok.", author: "LifeOS" },
    ],
    disiplin: [
      { content: "Disiplin adalah jembatan antara tujuan dan pencapaian.", author: "Jim Rohn" },
      { content: "Kita adalah apa yang kita lakukan berulang kali; keunggulan bukan tindakan, tapi kebiasaan.", author: "Aristoteles" },
      { content: "Rasa sakit dari disiplin jauh lebih ringan daripada rasa sakit dari penyesalan.", author: "LifeOS" },
    ],
    keluarga: [
      { content: "Keluarga bukan sekadar hal penting, melainkan segalanya.", author: "Michael J. Fox" },
      { content: "Waktu terbaik bersama keluarga adalah waktu yang kamu pilih untuk hadir.", author: "LifeOS" },
    ],
    fokus: [
      { content: "Konsentrasi adalah kunci sukses; fokus pada satu hal pada satu waktu.", author: "LifeOS" },
      { content: "Kamu tidak bisa melakukan segalanya, tapi kamu bisa melakukan yang paling penting.", author: "LifeOS" },
    ],
    kesehatan: [
      { content: "Jaga tubuhmu, itu satu-satunya tempat yang harus kamu tinggali.", author: "Jim Rohn" },
      { content: "Kesehatan bukan segalanya, tapi tanpa kesehatan segalanya bukan apa-apa.", author: "Arthur Schopenhauer" },
    ],
    kerja: [
      { content: "Pilih pekerjaan yang kamu cintai, dan kamu tidak akan bekerja sehari pun dalam hidupmu.", author: "Confucius" },
      { content: "Kerja keras mengalahkan bakat ketika bakat tidak bekerja keras.", author: "Tim Notke" },
    ],
    hidup: [
      { content: "Hidup adalah 10% apa yang terjadi padamu dan 90% bagaimana kamu meresponsnya.", author: "Charles Swindoll" },
      { content: "Satu-satunya cara melakukan pekerjaan hebat adalah mencintai apa yang kamu lakukan.", author: "Steve Jobs" },
    ],
  };

  const key = topic.toLowerCase();
  let source = pools[key] ?? pools.hidup;
  if (!pools[key]) {
    source = [
      ...pools.motivasi,
      ...pools.disiplin,
      { content: `Hal terbaik tentang "${topic}" adalah kamu memutuskan untuk memperhatikannya hari ini.`, author: "LifeOS" },
    ];
  }

  // Rotasi & potong sesuai count
  const result: Quote[] = [];
  const day = new Date().getDate();
  for (let i = 0; i < count; i++) {
    result.push(source[(day + i) % source.length]);
  }
  return result;
}

/** Konteks hidup user dari LifeOS — membuat quote relevan dengan situasi nyata. */
export function buildLifeContext(): string {
  try {
    const today = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
    const parts: string[] = [`Hari ini: ${today}`];
    const mood = db.select().from(moodEntries).orderBy(desc(moodEntries.date)).limit(1).get();
    if (mood) {
      const moodLabel = ["", "sangat buruk", "buruk", "biasa", "baik", "sangat baik"][mood.mood] ?? "biasa";
      parts.push(`Mood terakhir (${mood.date}): ${moodLabel} (${mood.mood}/5)${mood.note ? ` — catatan: "${mood.note}"` : ""}`);
    }
    const acts = db.select().from(activities).orderBy(desc(activities.id)).limit(3).all();
    if (acts.length > 0) {
      const latest = acts[0];
      parts.push(`Aktivitas terbaru: "${latest.name}"${latest.description ? ` — ${latest.description}` : ""}${latest.durationMinutes ? ` (${Math.round(latest.durationMinutes)} menit)` : ""}`);
      if (acts.length > 1) parts.push(`Aktivitas lain: ${acts.slice(1).map((a) => a.name).join(", ")}`);
    }
    return parts.join("\n");
  } catch {
    return "";
  }
}

/** Generate quotes untuk hari ini — simpan ke DB, kembalikan daftar. */
export async function generateQuotes(input: {
  count: number;
  topic: string;
  personality?: Personality;
  /** Konteks tambahan dari user (situasi/cerita) */
  context?: string;
}): Promise<{
  ok: boolean;
  data: Quote[];
  source: "ai" | "heuristik";
  error?: string;
}> {
  const count = Math.min(10, Math.max(1, Number(input.count) || 1));
  const topic = (input.topic || "motivasi").trim();
  const personality: Personality = (PERSONALITIES.some((p) => p.value === input.personality) ? input.personality : "bijak") as Personality;
  const today = new Date().toISOString().slice(0, 10);
  const heuristik = buildHeuristicQuotes(count, topic);

  // Konteks dalam: data LifeOS (mood, aktivitas) + cerita user
  const lifeContext = buildLifeContext();
  const userContext = (input.context || "").trim();

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      `Buat ${count} quotes bermakna tentang topik: "${topic}". ` +
        "PEDOMAN KUALITAS (ilmu & kedalaman):\n" +
        "- Setiap kutipan harus mengandung KEBUTUHAN FILOSOFIS/ILMIAH, bukan klise motivasi generik.\n" +
        "- Rujuk prinsip nyata sesuai topik: psikologi (stoikisme, habit loop, delayed gratification), keuangan (value investing, anti riba, margin of safety), kesehatan (hormesis, sleep hygiene), produktivitas (deep work, Parkinson's law), keluarga (attachment, intentional time), spiritual (syukur, tawakal).\n" +
        "- 1-2 kalimat, bahasa Indonesia, padat, tak menggurui.\n" +
        `PERSONALITY AI: ${PERSONA_GUIDE[personality]}\n` +
        "KONTEKS HIDUP USER (relevansikan quote dengan situasi ini — jangan asal umum):\n" +
        `${lifeContext || "- belum ada data LifeOS"}\n` +
        (userContext ? `CERITA/SITUASI DARI USER: ${userContext}\n` : "") +
        `Output JSON: {"quotes":[{"content":"...","author":"nama tokoh/'-' jika orisinal"}]} dengan tepat ${count} item. ` +
        "Jika topik tidak jelas, buat quote umum yang tetap dalam & bermakna.",
      `Topik: ${topic}\nPersonality: ${personality}${userContext ? `\nKonteks user: ${userContext}` : ""}`
    );
    const { text } = await generateText({ model, system, prompt: user, temperature: 0.8 });
    const parsed = parseQuoteJson(text);
    if (parsed && parsed.length > 0) {
      saveQuotes(today, parsed.slice(0, count), topic);
      return { ok: true, data: parsed.slice(0, count), source: "ai" };
    }
    saveQuotes(today, heuristik, topic);
    return { ok: true, data: heuristik, source: "heuristik" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      saveQuotes(today, heuristik, topic);
      return { ok: true, data: heuristik, source: "heuristik" };
    }
    console.error("AI quotes error:", err);
    saveQuotes(today, heuristik, topic);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

/** Simpan quote ke DB — APPEND (quote baru bertambah, tidak menghapus yang lama). */
function saveQuotes(date: string, quotes: Quote[], topic: string) {
  const existing = db
    .select()
    .from(dailyQuotes)
    .where(eq(dailyQuotes.date, date))
    .all();
  const startPos = existing.length;
  quotes.forEach((q, i) => {
    db.insert(dailyQuotes)
      .values({
        date,
        content: q.content,
        author: q.author && q.author !== "-" ? q.author : "LifeOS",
        topic,
        position: startPos + i,
      })
      .run();
  });
}

/** Ambil quote hari ini (untuk slider). */
export function getQuotesByDate(date?: string): Quote[] {
  const d = date ?? new Date().toISOString().slice(0, 10);
  return db
    .select()
    .from(dailyQuotes)
    .where(eq(dailyQuotes.date, d))
    .orderBy(asc(dailyQuotes.position))
    .all()
    .map((r) => ({ content: r.content, author: r.author ?? "" }));
}

/** Semua quote (riwayat lengkap — halaman Quotes), terbaru dulu. */
export function getAllQuotes() {
  return db
    .select()
    .from(dailyQuotes)
    .orderBy(desc(dailyQuotes.date), asc(dailyQuotes.position))
    .all();
}

/** Parse JSON dari output LLM — toleran thd markdown fence & bentuk array. */
function parseQuoteJson(text: string): Quote[] | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const list = Array.isArray(parsed) ? parsed : parsed.quotes;
    if (!Array.isArray(list)) return null;
    const valid = list
      .filter((q) => q && typeof q.content === "string" && q.content.trim())
      .map((q) => ({ content: q.content.trim(), author: typeof q.author === "string" ? q.author : "" }));
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}
