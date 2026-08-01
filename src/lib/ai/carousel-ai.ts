import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";

/** Skema hasil generate carousel: konten slide + spesifikasi background (1 panggilan LLM). */
export const CarouselContentSchema = z.object({
  /** Judul/caption utama carousel */
  judul: z.string(),
  slides: z.array(
    z.object({
      heading: z.string(),
      points: z.array(z.string()).max(4),
      emoji: z.string().optional().default(""),
    })
  ),
  caption: z.string(),
  hashtags: z.array(z.string()),
  /** Spesifikasi background yang akan dirender via JS/canvas */
  bgSpec: z.object({
    style: z.enum(["mesh", "wave", "geometric", "glow", "minimal"]),
    palet: z.array(z.string()).length(3),
    arahGradient: z.string().default("135deg"),
    bentuk: z.string().optional().default(""),
  }),
});

export type CarouselContent = z.infer<typeof CarouselContentSchema>;

/** Tema warna default (fallback saat bgSource = gradient). */
export const CAROUSEL_THEMES: Record<string, string[]> = {
  teal: ["#0D9488", "#134E4A", "#5EEAD4"],
  emas: ["#F59E0B", "#92400E", "#FDE68A"],
  lavender: ["#8B5CF6", "#4C1D95", "#C4B5FD"],
  gelap: ["#0F172A", "#020617", "#334155"],
  terang: ["#F8FAFC", "#E2E8F0", "#0F172A"],
};

/**
 * Generate konten carousel: isi tiap slide (hook → poin → CTA) + caption + hashtag
 * + SPESIFIKASI BACKGROUND (dirender ke gambar via canvas di browser — hemat,
 * tanpa image generation API).
 */
export async function generateCarousel(
  topic: string,
  slideCount: number,
  theme: string,
  bgSource: "gambar" | "ai" | "gradient",
  contentStyle: "ringkas" | "informatif" = "ringkas"
): Promise<{ ok: boolean; data: CarouselContent | null; source: "ai" | "heuristik"; error?: string }> {
  try {
    const model = getModel();
    const paletDefault = CAROUSEL_THEMES[theme] ?? CAROUSEL_THEMES.teal;
    const pointRule =
      contentStyle === "informatif"
        ? "- points: 2-3 PARAGRAF PANJANG & INFORMATIF per slide (masing-masing 35-60 kata, 2-4 kalimat lengkap, penuh data, penjelasan detail & nilai edukasi — jangan pernah kalimat pendek)."
        : "- points: 2-3 poin singkat & padat (maks 8 kata per poin).";
    const system =
      buildSystemPrompt({ tone: "detail" }) +
      [
        "",
        "Kamu adalah desainer konten Instagram expert. Buat carousel slide sesuai topik user.",
        `Output JSON TANPA markdown dengan skema:`,
        '{"judul":"...","slides":[{"heading":"...","points":["..."],"emoji":"..."}],',
        '"caption":"...","hashtags":["..."],',
        '"bgSpec":{"style":"mesh|wave|geometric|glow|minimal","palet":["warna1","warna2","warna3"],"arahGradient":"135deg","bentuk":"..."}}',
        "",
        "Aturan:",
        `- Tepat ${slideCount} slide. Slide 1 = HOOK besar (heading kuat, 1 subtitle di points). Slide terakhir = CTA ajakan (simpan/follow/komentar).`,
        "- Tiap slide: heading 3-6 kata, emoji: 1 emoji relevan per slide (opsional).",
        pointRule,
        "- caption: 1-2 kalimat + ajakan.",
        "- hashtags: 8-12 hashtag Indonesia (mix populer & niche).",
        "- bgSpec: palet 3 warna cocok dengan topik (gaya modern). style pilih salah satu: mesh (gradient blur premium), wave (gelombang organik), geometric (lingkaran/bentuk transparan), glow (cahaya radial), minimal (polos + garis aksen).",
        `- Jika bgSource="gradient", gunakan palet default: ${paletDefault.join(", ")}.`,
        "- Semua teks dalam Bahasa Indonesia.",
      ].join("\n");

    const { text } = await generateText({
      model,
      system,
      prompt: `Topik carousel: "${topic}"\nJumlah slide: ${slideCount}\nBackground source: ${bgSource}\nGaya konten: ${contentStyle}`,
      temperature: 0.6,
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
    console.error("AI carousel error:", err);
    return { ok: true, data: null, source: "heuristik", error: msg };
  }
}

function parseJson(text: string): CarouselContent | null {
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const parsed = CarouselContentSchema.safeParse(JSON.parse(cleaned.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
