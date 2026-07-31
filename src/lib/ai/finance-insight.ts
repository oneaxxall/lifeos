import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { monthlySummary } from "@/lib/db/finance-repo";
import { db } from "@/lib/db";
import { budgets, subscriptions } from "@/lib/db/schema";

export const FinanceInsightSchema = z.object({
  pemborosan: z.array(
    z.object({
      kategori: z.string(),
      total: z.number(),
      rekomendasi: z.string(),
    })
  ),
  subscription: z.array(
    z.object({
      nama: z.string(),
      biayaBulanan: z.number(),
      saran: z.enum(["hapus", "pertahankan", "negosiasi"]),
      alasan: z.string(),
    })
  ),
  kebiasaan: z.array(
    z.object({
      pola: z.string(),
      dampak: z.string(),
      saran: z.string(),
    })
  ),
  ringkasan: z.string(),
});

export type FinanceInsight = z.infer<typeof FinanceInsightSchema>;

/** Data konteks untuk AI: transaksi bulan ini + subscription + budget */
function buildFinanceContext(): string {
  const month = new Date().toISOString().slice(0, 7);
  const summary = monthlySummary(month);

  const subs = db.select().from(subscriptions).all();
  const budgetRows = db.select().from(budgets).all();

  const subLines = subs
    .filter((s) => s.active)
    .map((s) => {
      const perMonth = s.cycle === "tahunan" ? Math.round(s.amount / 12) : s.amount;
      return `- ${s.name}: Rp${perMonth}/bulan (${s.cycle})${s.nextBillingDate ? `, tagih ${s.nextBillingDate}` : ""}`;
    })
    .join("\n");

  const budgetLines = budgetRows
    .map((b) => `- kategori id ${b.categoryId}: limit Rp${b.limitAmount}/bulan`)
    .join("\n");

  return [
    `Bulan: ${month}`,
    `Total pemasukan: Rp${summary.masuk}`,
    `Total pengeluaran: Rp${summary.keluar}`,
    `Pengeluaran per kategori:`,
    ...summary.kategori.map((k) => `  - ${k.nama}: Rp${k.total}`),
    ``,
    `Subscription aktif:`,
    subLines || "  (tidak ada)",
    ``,
    `Budget:`,
    budgetLines || "  (tidak ada)",
  ].join("\n");
}

/** Analisa keuangan AI (FIN-06/07/08).
 *  Fallback heuristik jika API key belum ada. */
export async function analyzeFinance(): Promise<{
  ok: boolean;
  data: FinanceInsight | null;
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  const context = buildFinanceContext();
  if (!context.includes("Pengeluaran per kategori") || monthlySummary(new Date().toISOString().slice(0, 7)).kategori.length === 0 && db.select().from(subscriptions).all().length === 0) {
    return { ok: true, data: null, source: "kosong" };
  }

  // Heuristik lokal tanpa LLM
  const heuristik = buildHeuristic();

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Analisa keuangan bulan ini. Output JSON: " +
        "{\"pemborosan\":[{\"kategori\":\"...\",\"total\":0,\"rekomendasi\":\"...\"}], " +
        "\"subscription\":[{\"nama\":\"...\",\"biayaBulanan\":0,\"saran\":\"hapus|pertahankan|negosiasi\",\"alasan\":\"...\"}], " +
        "\"kebiasaan\":[{\"pola\":\"...\",\"dampak\":\"...\",\"saran\":\"...\"}], " +
        "\"ringkasan\":\"1 kalimat\"}. " +
        "Maks 3 item per array. Beri angka Rupiah. Saran harus konkret & bisa ditindak.",
      context
    );

    const { text } = await generateText({ model, system, prompt: user, temperature: 0.3 });
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
    console.error("AI finance error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

function buildHeuristic(): FinanceInsight {
  const summary = monthlySummary(new Date().toISOString().slice(0, 7));
  const subs = db.select().from(subscriptions).all();

  const pemborosan = summary.kategori.slice(0, 3).map((k) => ({
    kategori: k.nama,
    total: k.total,
    rekomendasi: `Kategori terbesar ke-${summary.kategori.indexOf(k) + 1} — tinjau pengeluarannya.`,
  }));

  const subscription = subs
    .filter((s) => s.active)
    .map((s) => {
      const perMonth = s.cycle === "tahunan" ? Math.round(s.amount / 12) : s.amount;
      return {
        nama: s.name,
        biayaBulanan: perMonth,
        saran: "pertahankan" as const,
        alasan: "Belum ada data pemakaian — tinjau manual pemakaiannya.",
      };
    });

  return {
    pemborosan,
    subscription,
    kebiasaan: [],
    ringkasan: "Mode offline — set AI_API_KEY untuk analisa mendalam.",
  };
}

function parseInsightJson(text: string): FinanceInsight | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const parsed = FinanceInsightSchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
