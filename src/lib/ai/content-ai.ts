import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";

/* ═══════════ Skema output AI ═══════════ */

export const IdeasSchema = z.object({
  ideas: z.array(z.object({ hook: z.string(), hookLine: z.string() })).min(3).max(6),
});
export type ContentIdeas = z.infer<typeof IdeasSchema>;

export const ScriptSchema = z.object({
  judul: z.string(),
  skrip: z.array(z.object({ bagian: z.string(), teks: z.string() })),
  caption: z.string(),
  hashtags: z.array(z.string()),
});
export type ContentScript = z.infer<typeof ScriptSchema>;

export const ProductAnalysisSchema = z.object({
  targetAudiens: z.string(),
  angleKonten: z.string(),
  estimasiKomisi: z.string(),
  saran: z.string(),
});
export type ProductAnalysis = z.infer<typeof ProductAnalysisSchema>;

/* ═══════════ Helper parse ═══════════ */

function parseJson<T>(text: string, schema: z.ZodType<T>): T | null {
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const parsed = schema.safeParse(JSON.parse(cleaned.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

type AiResult<T> = { ok: boolean; data: T | null; source: "ai" | "heuristik"; error?: string };

/* ═══════════ 1. Generate 5 ide hook video ═══════════ */

export async function generateContentIdeas(
  topic: string,
  format: string
): Promise<AiResult<ContentIdeas>> {
  try {
    const model = getModel();
    const system =
      buildSystemPrompt({ tone: "detail" }) +
      [
        "",
        "Kamu adalah kreator konten TikTok affiliate Indonesia yang viral.",
        "Buat 5 ide video untuk topik/produk user. Output JSON TANPA markdown:",
        '{"ideas":[{"hook":"judul ide","hookLine":"contoh kalimat pembuka 1-2 kalimat yang bikin berhenti scroll"}]}',
        "",
        "Aturan:",
        `- Format konten: ${format} (review/tips/unboxing/tutorial/comparison).`,
        "- hook: 3-8 kata, menarik, spesifik untuk audiens Indonesia (anak kos, ibu rumah tangga, pekerja, pelajar).",
        "- hookLine: bahasa sehari-hari Indonesia, rasa penasaran/emosi/keuntungan, maks 25 kata.",
        "- Variasikan angle: emosi, keuntungan, rasa penasaran, masalah umum, komparasi.",
        "- Semua teks Bahasa Indonesia.",
      ].join("\n");

    const { text } = await generateText({
      model,
      system,
      prompt: `Topik/produk: ${topic}\nFormat: ${format}`,
      temperature: 0.7,
    });
    const parsed = parseJson(text, IdeasSchema);
    if (parsed) return { ok: true, data: parsed, source: "ai" };
    return { ok: true, data: null, source: "heuristik", error: "Gagal parse hasil AI" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) return { ok: true, data: null, source: "heuristik", error: "AI_API_KEY belum diatur" };
    console.error("AI ideas error:", err);
    return { ok: true, data: null, source: "heuristik", error: msg };
  }
}

/* ═══════════ 2. Generate naskah video ═══════════ */

export async function generateContentScript(
  topic: string,
  duration: number
): Promise<AiResult<ContentScript>> {
  try {
    const model = getModel();
    const system =
      buildSystemPrompt({ tone: "detail" }) +
      [
        "",
        "Kamu adalah penulis naskah video TikTok affiliate Indonesia.",
        `Buat naskah video ${duration} detik untuk topik user. Output JSON TANPA markdown:`,
        '{"judul":"...","skrip":[{"bagian":"hook|bridge|isi|CTA","teks":"..."}],',
        '"caption":"...","hashtags":["..."]}',
        "",
        "Aturan:",
        "- Struktur: HOOK (0-3 dtk, bikin berhenti scroll) → BRIDGE (kenalan) → ISI (poin/value) → CTA (follow/klik link affiliate).",
        "- Teks skrip = kata yang DIUCAPKAN, bahasa lisan Indonesia, natural, bukan bahasa tulisan.",
        `- Total teks skrip ±${Math.round(duration * 2.6)} kata (kecepatan bicara TikTok ~2.6 kata/detik).`,
        "- caption: 1-2 kalimat + ajakan klik link di bio.",
        "- hashtags: 10-15 hashtag TikTok Indonesia (#fyp #affiliate #reviewproduk + niche).",
        "- Semua teks Bahasa Indonesia.",
      ].join("\n");

    const { text } = await generateText({
      model,
      system,
      prompt: `Topik: ${topic}`,
      temperature: 0.6,
    });
    const parsed = parseJson(text, ScriptSchema);
    if (parsed) return { ok: true, data: parsed, source: "ai" };
    return { ok: true, data: null, source: "heuristik", error: "Gagal parse hasil AI" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) return { ok: true, data: null, source: "heuristik", error: "AI_API_KEY belum diatur" };
    console.error("AI script error:", err);
    return { ok: true, data: null, source: "heuristik", error: msg };
  }
}

/* ═══════════ 3. Analisa produk affiliate ═══════════ */

export async function analyzeAffiliateProduct(
  product: string,
  marketplace: string,
  price: number
): Promise<AiResult<ProductAnalysis>> {
  try {
    const model = getModel();
    const system =
      buildSystemPrompt({ tone: "detail" }) +
      [
        "",
        "Kamu adalah analis affiliate marketing TikTok Indonesia.",
        "Analisa potensi produk untuk affiliate. Output JSON TANPA markdown:",
        '{"targetAudiens":"...","angleKonten":"...","estimasiKomisi":"...","saran":"..."}',
        "",
        "Aturan:",
        "- targetAudiens: siapa yang paling mungkin beli (usia, gaya hidup, masalah).",
        "- angleKonten: angle video yang paling efektif untuk produk ini.",
        "- estimasiKomisi: perkiraan % komisi & nominal (sesuai pasar affiliate Indonesia, umum 5-20%).",
        "- saran: 2-3 langkah konkret promosi.",
        "- Semua teks Bahasa Indonesia.",
      ].join("\n");

    const { text } = await generateText({
      model,
      system,
      prompt: `Produk: ${product}\nMarketplace: ${marketplace}\nHarga: Rp${price.toLocaleString("id-ID")}`,
      temperature: 0.5,
    });
    const parsed = parseJson(text, ProductAnalysisSchema);
    if (parsed) return { ok: true, data: parsed, source: "ai" };
    return { ok: true, data: null, source: "heuristik", error: "Gagal parse hasil AI" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) return { ok: true, data: null, source: "heuristik", error: "AI_API_KEY belum diatur" };
    console.error("AI product error:", err);
    return { ok: true, data: null, source: "heuristik", error: msg };
  }
}
