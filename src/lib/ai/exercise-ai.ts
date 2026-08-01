import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";

/** Skema program latihan lengkap dari AI. */
export const ExerciseProgramSchema = z.object({
  judul: z.string(),
  ringkasan: z.string(),
  durasiProgram: z.string(),
  frekuensi: z.string(),
  makanan: z.array(z.object({ makan: z.string(), kapan: z.string(), catatan: z.string() })),
  olahraga: z.array(z.object({ nama: z.string(), frekuensi: z.string(), durasi: z.string() })),
  gerakan: z.array(
    z.object({ nama: z.string(), set: z.string(), repetisi: z.string(), istirahat: z.string(), catatan: z.string() })
  ),
  diet: z.array(z.string()),
  istirahat: z.object({ tidur: z.string(), recovery: z.string(), catatan: z.string() }),
  catatan: z.string(),
});

export type ExerciseProgram = z.infer<typeof ExerciseProgramSchema>;

/**
 * Generate training program terintegrasi: makanan, olahraga, gerakan, diet, istirahat.
 * Input = tujuan user ("Saya ingin memperbesar lengan saya") → AI breakdown lengkap.
 */
export async function generateExerciseProgram(
  goal: string
): Promise<{ ok: boolean; data: ExerciseProgram | null; source: "ai" | "heuristik"; error?: string }> {
  try {
    const model = getModel();
    const system =
      buildSystemPrompt({ tone: "detail" }) +
      [
        "",
        "Kamu adalah personal trainer & ahli nutrisi. Buat program latihan sesuai TUJUAN user.",
        "Output JSON TANPA markdown, dengan skema:",
        '{"judul":"...","ringkasan":"...","durasiProgram":"...","frekuensi":"...",',
        '"makanan":[{"makan":"...","kapan":"...","catatan":"..."}],',
        '"olahraga":[{"nama":"...","frekuensi":"...","durasi":"..."}],',
        '"gerakan":[{"nama":"...","set":"...","repetisi":"...","istirahat":"...","catatan":"..."}],',
        '"diet":["..."],"istirahat":{"tidur":"...","recovery":"...","catatan":"..."},"catatan":"..."}',
        "Program harus spesifik, aman, progresif, dan realistis untuk pemula hingga menengah.",
        "Sertakan gerakan yang SANGAT bermanfaat untuk tujuan tersebut + pola istirahat yang tepat.",
      ].join("\n");

    const { text } = await generateText({
      model,
      system,
      prompt: `Tujuan saya: ${goal}`,
      temperature: 0.5,
    });
    const parsed = parseJson(text);
    if (parsed) {
      return { ok: true, data: parsed, source: "ai" };
    }
    return { ok: true, data: null, source: "heuristik", error: "Gagal parse hasil AI" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      return { ok: true, data: null, source: "heuristik", error: "AI_API_KEY belum diatur" };
    }
    console.error("AI exercise error:", err);
    return { ok: true, data: null, source: "heuristik", error: msg };
  }
}

function parseJson(text: string): ExerciseProgram | null {
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const parsed = ExerciseProgramSchema.safeParse(JSON.parse(cleaned.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
