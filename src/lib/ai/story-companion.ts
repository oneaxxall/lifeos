import { generateText } from "ai";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";

/** Konteks satu cerita untuk AI curhat. */
export interface StoryContext {
  id: number;
  age: number;
  title: string;
  category: string;
  actors: string;
  story: string;
}

/** Konteks profil hidup — akar pemahaman AI. */
export interface ProfileContext {
  birthDate?: string;
  values?: string;
  childhoodWounds?: string;
  parenting?: string;
  family?: string;
  lifeNotes?: string;
}

export interface CompanionInput {
  age: number;
  stories: StoryContext[];
  profile?: ProfileContext | null;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
}

/** Bangun system + user prompt untuk teman curhat (dipakai streaming & non-streaming). */
export function buildCompanionPrompt(input: CompanionInput): { system: string; user: string } {
  const { age, stories, profile, history, message } = input;
  const storiesText = stories
    .map(
      (s, i) =>
        `${i + 1}. [${s.age} tahun] "${s.title}" (${s.category}) — aktor: ${s.actors || "-"}\n${s.story}`
    )
    .join("\n\n");

  const profileText = profile
    ? [
        profile.birthDate ? `Tanggal lahir: ${profile.birthDate}` : null,
        profile.values ? `Nilai yang dipedulikan: ${profile.values}` : null,
        profile.childhoodWounds ? `Luka masa kecil: ${profile.childhoodWounds}` : null,
        profile.parenting ? `Pola asuh orang tua: ${profile.parenting}` : null,
        profile.family ? `Keluarga: ${profile.family}` : null,
        profile.lifeNotes ? `Catatan hidup: ${profile.lifeNotes}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "(belum diisi)";

  const historyText = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Kamu" : "Aku"}: ${m.content}`)
    .join("\n");

  const system =
    buildSystemPrompt({ tone: "detail" }) +
    [
      "",
      "Kamu adalah TEMAN CURHAT yang hangat, empatik, dan bijak untuk pengguna LifeOS.",
      `Pengguna sedang bercerita tentang pengalaman hidupnya saat usia ${age} tahun.`,
      "Gunakan PROFIL HIDUP di bawah untuk memahami latar belakang pengguna (nilai yang ia pegang, luka masa kecil, pola asuh). Hubungkan cerita saat ini dengan latar itu secara halus — tanpa menghakimi.",
      "Bacalah cerita-cerita di bawah sebagai konteks, lalu balas pesan terbaru pengguna dengan gaya teman curhat yang tulus: validasi perasaan, tanya hal yang menambah kedalaman, jangan menghakimi.",
      "Jangan memberi ceramah panjang. Jawab 2–4 kalimat hangat, lalu satu pertanyaan reflektif singkat di akhir (kecuali pengguna bertanya langsung).",
      "Jika cerita mengandung kesedihan/konflik, beri ruang emosi dulu, baru tawarkan sudut pandang.",
    ].join("\n");

  const user = `— PROFIL HIDUP PENGGUNA —\n${profileText}\n\n— CERITA-CERITA DI USIA ${age} TAHUN —\n${storiesText || "(belum ada cerita tertulis)"}\n\n— PERCAKAPAN SEBELUMNYA —\n${historyText || "(belum ada)"}\n\n— PESAN TERBARU —\n${message}\n\nBalas sebagai teman curhat.`;

  return { system, user };
}

/**
 * AI teman curhat (story companion) — memahami cerita di stage usia tertentu,
 * lalu membalas pesan user dengan empati sebagai teman curhat, bukan penasihat kaku.
 * Dipanggil hanya saat user mengirim pesan (hemat biaya — lazy).
 */
export async function chatWithCompanion(input: CompanionInput): Promise<{ ok: boolean; reply: string; source: "ai" | "heuristik" }> {
  const { age, stories } = input;

  // Fallback heuristik tanpa LLM (jika API key belum ada / gagal)
  const heuristik = () =>
    `Aku mendengarkan ceritamu di usia ${age} tahun. 🌱 Setiap babak hidup punya maknanya sendiri — yang kamu tulis di sini adalah jejak yang membentuk dirimu hari ini.\n\n` +
    `Cerita "${stories[0]?.title ?? "ini"}" menunjukkan kamu sedang merefleksikan momen penting. Terus tulis, karena mengingat adalah cara memahami. 💛`;

  try {
    const model = getModel();
    const { system, user } = buildCompanionPrompt(input);
    const { text } = await generateText({ model, system, prompt: user, temperature: 0.8 });
    return { ok: true, reply: text.trim(), source: "ai" };
  } catch (err) {
    console.error("story-companion error:", err);
    return { ok: true, reply: heuristik(), source: "heuristik" };
  }
}
