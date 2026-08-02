import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";

/* ═══════════ Skema output AI ═══════════ */

export const FinancialAnalysisSchema = z.object({
  ringkasan: z.string(),
  prioritasLunas: z.array(z.object({ nama: z.string(), alasan: z.string() })),
  alokasi: z.object({
    danaDarurat: z.string(),
    investasiBulanan: z.string(),
    modalDividen: z.string(),
    estimasiTahunDividen: z.string(),
  }),
  roadmap: z.array(z.string()),
  catatanAntiRiba: z.string(),
});
export type FinancialAnalysis = z.infer<typeof FinancialAnalysisSchema>;

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

export interface FinancialAiInput {
  age: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySavings: number;
  emergencyMonths: number;
  emergencyCurrent: number;
  stockPct: number;
  bondPct: number;
  cashPct: number;
  stockReturn: number;
  bondReturn: number;
  cashReturn: number;
  inflation: number;
  fireMultiple: number;
  dividendTarget: number;
  dividendYield: number;
  schoolInflation: number;
  children: { name: string; age: number; schoolLevel: string; schoolCostYear: number }[];
  debts: {
    party: string;
    amount: number;
    paidAmount: number;
    paymentMode: string;
    installmentCount: number;
    installmentsPaid: number;
    interestRate: number;
    monthlyInstallment: number;
    dueDate: string;
  }[];
}

/** Analisa keuangan menyeluruh: prioritas lunas cicilan, alokasi dana, roadmap dividen & FIRE. */
export async function analyzeFinancial(input: FinancialAiInput): Promise<{
  ok: boolean;
  data: FinancialAnalysis | null;
  source: "ai" | "heuristik";
  error?: string;
}> {
  try {
    const model = getModel();
    const system =
      buildSystemPrompt({ tone: "detail" }) +
      [
        "",
        "Kamu adalah perencana keuangan syariah Indonesia yang tegas anti riba dan sangat detail.",
        "Analisa kondisi keuangan user lalu berikan rekomendasi. Output JSON TANPA markdown:",
        '{"ringkasan":"1-2 kalimat kondisi keuangan user",',
        '"prioritasLunas":[{"nama":"nama cicilan","alasan":"kenapa harus dilunasi urutan ini"}],',
        '"alokasi":{"danaDarurat":"...","investasiBulanan":"...","modalDividen":"...","estimasiTahunDividen":"..."},',
        '"roadmap":["langkah 1","langkah 2",...],"catatanAntiRiba":"..."}',
        "",
        "Aturan analisa:",
        "- Urutkan prioritas lunas: dahulukan cicilan dengan sisa kecil + tenor pendek (efek psikologis) DAN cicilan dengan bunga tinggi (beban terbesar). Tanpa bunga → urutkan dari sisa terkecil.",
        "- Alokasi: dana darurat (6x pengeluaran) → cicilan → investasi; modalDividen = targetDividen / (yield/100).",
        "- estimasiTahunDividen: perkirakan tahun mencapai modal dividen dari investasi bulanan (tanpa riba, return saham syariah ~10-12%).",
        "- Roadmap 4-6 langkah konkret berurutan (darurat → lunas → investasi → dividen).",
        "- Semua angka dalam Bahasa Indonesia, format rupiah dengan titik.",
        "- Jangan pernah menyarankan riba/bunga.",
      ].join("\n");

    const debtsSummary = input.debts
      .map(
        (d) =>
          `- ${d.party}: sisa Rp${(d.amount - d.paidAmount).toLocaleString("id-ID")} (dari Rp${d.amount.toLocaleString(
            "id-ID"
          )}), angsuran Rp${(d.monthlyInstallment || 0).toLocaleString("id-ID")}/bulan, bunga ${d.interestRate}%/thn, tenor ${d.installmentCount}x, jatuh tempo ${d.dueDate || "-"}`
      )
      .join("\n");
    const childrenSummary = input.children
      .map((c) => `- ${c.name} (usia ${c.age}): ${c.schoolLevel}, biaya/tahun Rp${c.schoolCostYear.toLocaleString("id-ID")}`)
      .join("\n");

    const prompt = [
      `Usia: ${input.age} tahun`,
      `Pemasukan: Rp${input.monthlyIncome.toLocaleString("id-ID")}/bulan`,
      `Pengeluaran: Rp${input.monthlyExpense.toLocaleString("id-ID")}/bulan`,
      `Tabungan: Rp${input.monthlySavings.toLocaleString("id-ID")}/bulan`,
      `Dana darurat: Rp${input.emergencyCurrent.toLocaleString("id-ID")} (target ${input.emergencyMonths}x pengeluaran)`,
      `Alokasi investasi: saham ${input.stockPct}% (return ${input.stockReturn}%), obligasi ${input.bondPct}% (${input.bondReturn}%), kas ${input.cashPct}% (${input.cashReturn}%)`,
      `Inflasi ${input.inflation}%, target FIRE ${input.fireMultiple}x pengeluaran tahunan`,
      `Target dividen: Rp${input.dividendTarget.toLocaleString("id-ID")}/tahun dengan yield ${input.dividendYield}%`,
      `Anak:\n${childrenSummary || "- tidak ada data anak"}`,
      `Cicilan/hutang:\n${debtsSummary || "- tidak ada cicilan"}`,
    ].join("\n");

    const { text } = await generateText({
      model,
      system,
      prompt,
      temperature: 0.4,
    });
    const parsed = parseJson(text, FinancialAnalysisSchema);
    if (parsed) return { ok: true, data: parsed, source: "ai" };
    return { ok: true, data: null, source: "heuristik", error: "Gagal parse hasil AI" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) return { ok: true, data: null, source: "heuristik", error: "AI_API_KEY belum diatur" };
    console.error("AI financial error:", err);
    return { ok: true, data: null, source: "heuristik", error: msg };
  }
}
