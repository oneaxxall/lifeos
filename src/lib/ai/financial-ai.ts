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
  /** Rekomendasi alokasi persen dari pemasukan (aturan 50/30/20 + konteks user) */
  alokasiPersen: z.object({
    kebutuhan: z.number(),
    tabungan: z.number(),
    investasi: z.number(),
    cicilan: z.number(),
    penjelasan: z.string(),
  }),
  /** Status boros bulan berjalan (aktual vs rencana) */
  statusBoros: z.object({
    boros: z.boolean(),
    pesan: z.string(),
  }),
  /** Insight dari prinsip tokoh (Dalio/Buffett/Munger/dll) */
  insightTokoh: z.array(z.object({ tokoh: z.string(), quote: z.string(), penerapan: z.string() })),
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
  /** Data AKTUAL bulan berjalan dari fitur Finance */
  actualIncome: number;
  actualExpense: number;
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

/** Rangkuman konteks profil user untuk prompt AI. */
export function buildFinancialContext(input: FinancialAiInput): string {
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
  return [
    `Usia: ${input.age} tahun`,
    `Pemasukan: Rp${input.monthlyIncome.toLocaleString("id-ID")}/bulan`,
    `Pengeluaran: Rp${input.monthlyExpense.toLocaleString("id-ID")}/bulan`,
    `Tabungan: Rp${input.monthlySavings.toLocaleString("id-ID")}/bulan`,
    `Dana darurat: Rp${input.emergencyCurrent.toLocaleString("id-ID")} (target ${input.emergencyMonths}x pengeluaran)`,
    `Alokasi investasi: saham ${input.stockPct}% (return ${input.stockReturn}%), obligasi ${input.bondPct}% (${input.bondReturn}%), kas ${input.cashPct}% (${input.cashReturn}%)`,
    `Inflasi ${input.inflation}%, target FIRE ${input.fireMultiple}x pengeluaran tahunan`,
    `Target dividen: Rp${input.dividendTarget.toLocaleString("id-ID")}/tahun dengan yield ${input.dividendYield}%`,
    `AKTUAL bulan berjalan (dari fitur Finance): pemasukan masuk Rp${input.actualIncome.toLocaleString("id-ID")}, pengeluaran keluar Rp${input.actualExpense.toLocaleString("id-ID")}`,
    `Anak:\n${childrenSummary || "- tidak ada data anak"}`,
    `Cicilan/hutang:\n${debtsSummary || "- tidak ada cicilan"}`,
  ].join("\n");
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
        "Kamu adalah financial advisor syariah Indonesia yang tegas anti riba, berpengalaman, dan paham prinsip keuangan para investor legendaris.",
        "Analisa kondisi keuangan user (rencana + ACTUAL bulan berjalan) lalu berikan rekomendasi. Output JSON TANPA markdown:",
        '{"ringkasan":"1-2 kalimat kondisi keuangan user",',
        '"prioritasLunas":[{"nama":"nama cicilan","alasan":"kenapa harus dilunasi urutan ini"}],',
        '"alokasi":{"danaDarurat":"...","investasiBulanan":"...","modalDividen":"...","estimasiTahunDividen":"..."},',
        '"alokasiPersen":{"kebutuhan":50,"tabungan":20,"investasi":20,"cicilan":10,"penjelasan":"..."},',
        '"statusBoros":{"boros":true/false,"pesan":"..."},',
        '"insightTokoh":[{"tokoh":"Ray Dalio","quote":"...","penerapan":"..."}],',
        '"roadmap":["langkah 1",...],"catatanAntiRiba":"..."}',
        "",
        "Aturan analisa:",
        "- alokasiPersen: persentase dari PEMASUKAN (bulat, total 100). Acuan: aturan 50/30/20 (kebutuhan/tabungan/keinginan) versi syariah — kebutuhan hidup, tabungan darurat, investasi, cicilan. Sesuaikan dengan beban user (cicilan tinggi → kurangi kebutuhan/keinginan).",
        "- statusBoros: bandingkan pengeluaran ACTUAL bulan berjalan vs pengeluaran rencana bulanan user. Boros jika actual > rencana (selisih >5%). Beri pesan tegas tapi membangun dengan angka.",
        "- insightTokoh: 2-3 prinsip dari Ray Dalio (hidup di bawah kemampuan / All Weather), Warren Buffett (jangan kehilangan uang, beli aset produktif), Charlie Munger (disiplin & inversi) — masing-masing dengan quote terkenal (bahasa Inggris singkat) + penerapan konkret untuk kondisi user.",
        "- Urutkan prioritas lunas: dahulukan cicilan sisa kecil + tenor pendek (efek psikologis) DAN cicilan bunga tinggi (beban terbesar). Tanpa bunga → dari sisa terkecil.",
        "- Alokasi: dana darurat (6x pengeluaran) → cicilan → investasi; modalDividen = targetDividen / (yield/100).",
        "- estimasiTahunDividen: perkirakan tahun mencapai modal dividen dari investasi bulanan (return saham syariah ~10-12%).",
        "- Roadmap 4-6 langkah konkret berurutan (darurat → lunas → investasi → dividen).",
        "- Semua angka dalam Bahasa Indonesia, format rupiah dengan titik.",
        "- Jangan pernah menyarankan riba/bunga.",
      ].join("\n");

    const { text } = await generateText({
      model,
      system,
      prompt: buildFinancialContext(input),
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

/** Chat dengan AI advisor — menjawab pertanyaan dengan konteks profil keuangan user. */
export async function chatFinancial(
  input: FinancialAiInput,
  question: string
): Promise<{ ok: boolean; text: string | null; error?: string }> {
  try {
    const model = getModel();
    const system =
      buildSystemPrompt({ tone: "detail" }) +
      [
        "",
        "Kamu adalah financial advisor syariah Indonesia (anti riba) yang hangat, jelas, dan praktis.",
        "Jawab pertanyaan user berdasarkan KONTEKS profil keuangannya di bawah. Gunakan angka konkret dari profil.",
        "Format jawaban: ringkas (maks 150 kata), poin-poin bila perlu, Bahasa Indonesia, angka rupiah pakai titik.",
        "Jika pertanyaan di luar data profil, jawab dengan prinsip umum keuangan syariah yang aman.",
        "JANGAN pernah menyarankan riba/bunga — selalu arahkan ke instrumen syariah.",
      ].join("\n");

    const { text } = await generateText({
      model,
      system,
      prompt: `KONTEKS PROFIL USER:\n${buildFinancialContext(input)}\n\nPERTANYAAN USER:\n${question}`,
      temperature: 0.5,
    });
    return { ok: true, text: text.trim() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) return { ok: true, text: null, error: "AI_API_KEY belum diatur" };
    console.error("AI chat error:", err);
    return { ok: true, text: null, error: msg };
  }
}
