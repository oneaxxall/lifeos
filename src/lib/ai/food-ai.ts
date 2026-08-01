import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";

/** Skema hasil resep + gizi dari AI. */
export const FoodRecipeSchema = z.object({
  judul: z.string(),
  deskripsi: z.string(),
  porsi: z.string(),
  waktu: z.string(),
  bahan: z.array(z.string()),
  langkah: z.array(z.string()),
  gizi: z.object({
    kalori: z.string(),
    protein: z.string(),
    karbohidrat: z.string(),
    lemak: z.string(),
    serat: z.string(),
  }),
  vitamin: z.array(z.object({ nama: z.string(), manfaat: z.string() })),
  manfaat: z.array(z.string()),
});

export type FoodRecipe = z.infer<typeof FoodRecipeSchema>;

/**
 * Generate resep makanan lengkap dengan kandungan gizi (vitamin, protein, dll).
 * Output JSON terstruktur — disimpan utuh di DB untuk riwayat.
 */
export async function generateRecipe(
  request: string
): Promise<{ ok: boolean; data: FoodRecipe | null; source: "ai" | "heuristik"; error?: string }> {
  try {
    const model = getModel();
    const system =
      buildSystemPrompt({ tone: "detail" }) +
      [
        "",
        "Kamu adalah ahli gizi & koki. Buat resep makanan sesuai permintaan user.",
        "Output JSON TANPA markdown, dengan skema:",
        '{"judul":"...","deskripsi":"...","porsi":"...","waktu":"...",',
        '"bahan":["..."],"langkah":["..."],',
        '"gizi":{"kalori":"...","protein":"...","karbohidrat":"...","lemak":"...","serat":"..."},',
        '"vitamin":[{"nama":"...","manfaat":"..."}],"manfaat":["..."]}',
        "Kandungan gizi & vitamin harus akurat (perkiraan per porsi), manfaat dijelaskan ringkas.",
      ].join("\n");

    const { text } = await generateText({
      model,
      system,
      prompt: `Buatkan resep: ${request}`,
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
    console.error("AI food error:", err);
    return { ok: true, data: null, source: "heuristik", error: msg };
  }
}

function parseJson(text: string): FoodRecipe | null {
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const parsed = FoodRecipeSchema.safeParse(JSON.parse(cleaned.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
