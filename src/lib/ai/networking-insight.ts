import { generateText } from "ai";
import { z } from "zod";
import { asc } from "drizzle-orm";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";

export const NetworkingInsightSchema = z.object({
  followUp: z.array(
    z.object({
      nama: z.string(),
      hari: z.number(),
      konteks: z.string(),
      saranPesan: z.string(),
    })
  ),
  saranMingguan: z.array(
    z.object({
      nama: z.string(),
      alasan: z.string(),
    })
  ),
  analisa: z.string(),
  ringkasan: z.string(),
});

export type NetworkingInsight = z.infer<typeof NetworkingInsightSchema>;

/** Konteks AI: daftar kontak + hari sejak terakhir kontak */
function buildContactContext(): string {
  const rows = db.select().from(contacts).orderBy(asc(contacts.name)).all();
  const today = Date.now();

  const lines = rows
    .map((c) => {
      const last = c.lastContact ? new Date(c.lastContact + "T00:00:00").getTime() : null;
      const days = last ? Math.max(0, Math.round((today - last) / 86400000)) : null;
      return `- ${c.name} (${c.priority})${c.role ? `, ${c.role}` : ""}${c.company ? ` @ ${c.company}` : ""}` +
        ` | kenal: ${c.context || "-"}` +
        ` | minat: ${c.interests || "-"}` +
        ` | terakhir kontak: ${days !== null ? `${days} hari lalu` : "belum pernah"}`;
    })
    .join("\n");

  return [`KONTAK:`, lines || "  (belum ada kontak)"].join("\n");
}

/** Analisa networking AI — follow-up >90 hari + saran mingguan (NW-02/03). Fallback heuristik. */
export async function analyzeNetworking(): Promise<{
  ok: boolean;
  data: NetworkingInsight | null;
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  const rows = db.select().from(contacts).orderBy(asc(contacts.name)).all();
  if (rows.length === 0) {
    return { ok: true, data: null, source: "kosong" };
  }

  // Heuristik lokal tanpa LLM
  const heuristik = buildHeuristic(rows);

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Kamu adalah asisten CRM pribadi untuk seorang Software Engineering Manager. " +
        "Analisa daftar kontak dan output JSON: " +
        "{\"followUp\":[{\"nama\":\"...\",\"hari\":90,\"konteks\":\"konteks kenal/minat\",\"saranPesan\":\"kalimat singkat natural untuk menghubungi lagi\"}], " +
        "\"saranMingguan\":[{\"nama\":\"...\",\"alasan\":\"...\"}], " +
        "\"analisa\":\"kesehatan jaringan (berapa % penting yang sudah dingin >90 hari)\", " +
        "\"ringkasan\":\"1 kalimat\"}. " +
        "followUp = kontak dengan terakhir kontak > 90 hari (atau belum pernah). " +
        "saranMingguan = maks 3 kontak untuk dihubungi minggu ini (prioritas penting dulu). " +
        "Saran pesan natural & spesifik (sebutkan minat/konteks orang itu), bukan template.",
      buildContactContext()
    );

    const { text } = await generateText({ model, system, prompt: user, temperature: 0.4 });
    const parsed = parseInsightJson(text);
    if (parsed) {
      return { ok: true, data: parsed, source: "ai" };
    }
    return { ok: true, data: heuristik, source: "heuristik" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      return { ok: true, data: heuristik, source: "heuristik" };
    }
    console.error("AI networking error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

function buildHeuristic(rows: {
  name: string;
  role: string | null;
  company: string | null;
  context: string | null;
  interests: string | null;
  priority: string;
  lastContact: string | null;
}[]): NetworkingInsight {
  const today = Date.now();
  const withDays = rows.map((c) => {
    const last = c.lastContact ? new Date(c.lastContact + "T00:00:00").getTime() : null;
    return { ...c, days: last ? Math.max(0, Math.round((today - last) / 86400000)) : null };
  });

  // Follow-up: > 90 hari atau belum pernah
  const followUp = withDays
    .filter((c) => c.days === null || c.days > 90)
    .sort((a, b) => {
      const pa = a.priority === "penting" ? 0 : a.priority === "sedang" ? 1 : 2;
      const pb = b.priority === "penting" ? 0 : b.priority === "sedang" ? 1 : 2;
      return pa - pb || (a.days ?? 999) - (b.days ?? 999);
    })
    .slice(0, 5)
    .map((c) => ({
      nama: c.name,
      hari: c.days ?? 999,
      konteks: c.context || c.interests || c.role || "kontak profesional",
      saranPesan: `Halo ${c.name.split(" ")[0]}, lama tidak berjumpa! Bagaimana kabarmu${c.interests ? ` — ${c.interests.split(",")[0].toLowerCase()}nya masih jalan?` : "?"}`,
    }));

  // Saran mingguan: 3 kontak (prioritas penting/sedang dulu)
  const priorityOrder = { penting: 0, sedang: 1, ringan: 2 } as const;
  const saranMingguan = withDays
    .sort((a, b) => {
      const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
      const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
      return pa - pb || (a.days ?? 0) - (b.days ?? 0);
    })
    .slice(0, 3)
    .map((c) => ({
      nama: c.name,
      alasan: c.days === null
        ? "Belum pernah dihubungi — hangatkan relasi baru"
        : c.days > 90
          ? `Sudah ${c.days} hari tidak kontak`
          : `Terakhir ${c.days} hari lalu — jaga relasi tetap hangat`,
    }));

  // Analisa kesehatan jaringan
  const important = withDays.filter((c) => c.priority === "penting");
  const coldImportant = important.filter((c) => c.days === null || c.days > 90);
  const coldPct = important.length > 0 ? Math.round((coldImportant.length / important.length) * 100) : 0;

  return {
    followUp,
    saranMingguan,
    analisa: important.length > 0
      ? `${coldImportant.length}/${important.length} relasi prioritas sudah dingin (>90 hari) — ${coldPct}%. Jadwalkan 2 kontak/hari untuk menghangatkan.`
      : `Total ${withDays.length} kontak tercatat. Tambahkan prioritas "penting" untuk analisa lebih akurat.`,
    ringkasan: "Mode offline — set AI_API_KEY untuk saran pesan yang lebih personal.",
  };
}

function parseInsightJson(text: string): NetworkingInsight | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const parsed = NetworkingInsightSchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
