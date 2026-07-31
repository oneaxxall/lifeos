import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";

export const FamilyAdviceSchema = z.object({
  empati: z.string(),
  perspektif: z.string(),
  saran: z.array(z.string()),
  ringkasan: z.string(),
});

export type FamilyAdvice = z.infer<typeof FamilyAdviceSchema>;

/** Kata kunci sensitif → saran dukungan profesional */
const SENSITIVE_TOPICS = [
  "kekerasan", "dipukul", "memukul", "diancam", "mengancam", "kecanduan",
  "judi", "selingkuh", "perceraian", "cerai", "menyerah", "ingin pergi",
  "bunuh diri", "menyakiti diri", "takut pulang", "trauma",
];

/**
 * Nasihat AI konteks keluarga — empatik, bijak, tanpa menggurui.
 * Fallback heuristik jika API key belum ada.
 */
export async function analyzeFamilyVent(input: {
  content: string;
  people?: string;
  mood?: string;
}): Promise<{ ok: boolean; data: FamilyAdvice; source: "ai" | "heuristik" }> {
  // Heuristik lokal tanpa LLM
  const heuristik = buildHeuristic(input);

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Kamu adalah sahabat yang bijak dan hangat, bukan terapis dan bukan penghakim. " +
        "Pengguna curhat tentang kehidupan keluarganya. Tugasmu: " +
        "1) empati tulus (1-2 kalimat), " +
        "2) perspektif/refleksi yang menenangkan tanpa menyalahkan siapa pun, " +
        "3) 2-4 saran tindakan konkret yang bisa dilakukan HARI INI, " +
        "4) ringkasan 1 kalimat yang menenangkan. " +
        "Output JSON: {\"empati\":\"...\",\"perspektif\":\"...\",\"saran\":[\"...\"],\"ringkasan\":\"...\"}. " +
        "Bahasa Indonesia, hangat, panggil 'Kamu'. Jika ada tanda kekerasan/ancaman/keselamatan, saran pertama WAJIB dorong mencari bantuan profesional/lembaga terkait.",
      JSON.stringify(
        {
          curhatan: input.content,
          yangTerlibat: input.people || "tidak disebutkan",
          suasanaHati: input.mood || "tidak disebutkan",
        },
        null,
        2
      )
    );

    const { text } = await generateText({ model, system, prompt: user, temperature: 0.4 });
    const parsed = parseAdviceJson(text);
    if (parsed) {
      return { ok: true, data: parsed, source: "ai" };
    }
    return { ok: true, data: heuristik, source: "heuristik" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      return { ok: true, data: heuristik, source: "heuristik" };
    }
    console.error("AI family error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

function buildHeuristic(input: {
  content: string;
  people?: string;
  mood?: string;
}): FamilyAdvice {
  const text = input.content.toLowerCase();
  const sensitive = SENSITIVE_TOPICS.some((t) => text.includes(t));
  const who = input.people?.trim() ? ` dengan ${input.people}` : "";

  const saran: string[] = [
    "Ambil napas panjang dulu — kamu tidak harus menyelesaikan semuanya hari ini.",
    "Tulis 1 hal yang ingin kamu sampaikan dengan tenang, lalu pilih waktu yang tepat untuk bicara.",
    "Jaga dirimu dulu: tidur cukup dan makan teratur — energimu memengaruhi caramu menghadapi ini.",
  ];

  if (sensitive) {
    saran.unshift(
      "Keselamatanmu dan keluargamu prioritas utama — jika ada kekerasan/ancaman, hubungi pihak yang bisa membantu (psikolog, lembaga perlindungan, atau layanan darurat)."
    );
  }

  return {
    empati: `Aku dengar kamu sedang berat akhir-akhir ini${who}. Terima kasih sudah mau menuangkannya di sini.`,
    perspektif: sensitive
      ? "Situasi yang kamu ceritakan menyentuh hal yang sangat sensitif — kamu tidak sendirian, dan meminta bantuan adalah langkah yang berani, bukan kelemahan."
      : "Setiap keluarga punya dinamikanya sendiri. Kadang yang kita butuhkan bukan jawaban instan, tapi ruang untuk didengar dan jeda untuk berpikir jernih.",
    saran,
    ringkasan: sensitive
      ? "Kamu layak merasa aman — jangan ragu mencari bantuan profesional."
      : "Satu langkah kecil hari ini lebih berharga daripada seratus rencana besok.",
  };
}

function parseAdviceJson(text: string): FamilyAdvice | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const parsed = FamilyAdviceSchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
