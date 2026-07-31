import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";

export const SickAdviceSchema = z.object({
  analisa: z.string(),
  saran: z.array(z.string()),
  needsProfessional: z.boolean(),
  ringkasan: z.string(),
});

export type SickAdvice = z.infer<typeof SickAdviceSchema>;

/** Kata-kata yang memicu saran konsultasi profesional */
const RED_FLAGS = [
  "sesak napas", "susah bernapas", "nyeri dada", "darah", "muntah terus",
  "demam tinggi", "tidak sadar", "lemas parah", "sulit bicara", "mati rasa",
  "pingsan", "kejang", "panas 3 hari", "nyeri hebat", "sulit menelan",
];

/**
 * Analisa gejala tidak enak badan (AI). Fallback heuristik jika API key belum ada.
 * PENTING: dukungan umum, BUKAN diagnosis medis.
 */
export async function analyzeSymptoms(input: {
  symptoms: string;
  duration?: string;
  notes?: string;
}): Promise<{ ok: boolean; data: SickAdvice; source: "ai" | "heuristik" }> {
  // Heuristik lokal tanpa LLM
  const heuristik = buildHeuristic(input);

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Kamu adalah penasihat kesehatan gaya hidup yang BERHATI-HATI. Pengguna merasa tidak enak badan dan menuliskan gejalanya. " +
        "Tugas: beri analisa ringan (kemungkinan penyebab umum, bukan diagnosis), 3-5 saran perawatan mandiri yang aman, " +
        "dan deteksi apakah gejala butuh penanganan profesional (butuhProfesional=true). " +
        "Output JSON: {\"analisa\":\"1-2 kalimat\",\"saran\":[\"...\"],\"needsProfessional\":true/false,\"ringkasan\":\"1 kalimat\"}. " +
        "WAJIB: selesaikan dengan disclaimer bahwa ini bukan diagnosis medis. " +
        "Jika ada gejala bahaya (sesak napas, nyeri dada, demam sangat tinggi, dll), needsProfessional WAJIB true.",
      JSON.stringify(
        {
          gejala: input.symptoms,
          durasi: input.duration || "tidak disebutkan",
          catatan: input.notes || "",
        },
        null,
        2
      )
    );

    const { text } = await generateText({ model, system, prompt: user, temperature: 0.3 });
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
    console.error("AI sick error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

function buildHeuristic(input: {
  symptoms: string;
  duration?: string;
  notes?: string;
}): SickAdvice {
  const symptoms = input.symptoms.toLowerCase();
  const hasRedFlag = RED_FLAGS.some((f) => symptoms.includes(f));

  const saran: string[] = [
    "Perbanyak istirahat dan minum air putih (minimal 8 gelas/hari).",
    "Makan makanan ringan yang mudah dicerna, hindari yang terlalu berminyak.",
    "Pantau gejala — catat jika memburuk atau muncul gejala baru.",
  ];

  // Deteksi kata kunci umum
  if (symptoms.includes("demam") || symptoms.includes("panas")) {
    saran.push("Ukur suhu secara berkala; kompres hangat jika demam. Paracetamol sesuai dosis jika perlu.");
  }
  if (symptoms.includes("batuk") || symptoms.includes("pilek") || symptoms.includes("flu")) {
    saran.push("Hangatkan tubuh, minum jahe/wedang hangat, hindari AC terlalu dingin.");
  }
  if (symptoms.includes("sakit kepala") || symptoms.includes("pusing") || symptoms.includes("migrain")) {
    saran.push("Kurangi cahaya & layar, tidur cukup, hindari kafein berlebih.");
  }
  if (symptoms.includes("mual") || symptoms.includes("muntah") || symptoms.includes("diare")) {
    saran.push("Minum oralit/elektrolit, makan porsi kecil tapi sering.");
  }

  return {
    analisa: hasRedFlag
      ? "Gejala yang kamu sebutkan termasuk tanda yang perlu diwaspadai."
      : "Gejala umum ini bisa disebabkan berbagai hal — paling sering kelelahan, kurang tidur, atau infeksi ringan.",
    saran,
    needsProfessional: hasRedFlag,
    ringkasan: hasRedFlag
      ? "⚠️ Segera konsultasi ke tenaga medis — gejalamu perlu diperiksa langsung."
      : "Coba perawatan mandiri dulu; segera ke dokter jika gejala memburuk dalam 2-3 hari.",
  };
}

function parseAdviceJson(text: string): SickAdvice | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const parsed = SickAdviceSchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
