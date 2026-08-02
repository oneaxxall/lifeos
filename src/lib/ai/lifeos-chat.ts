import { streamText } from "ai";
import { and, desc, eq, sql } from "drizzle-orm";
import { getChatModel } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";
import { db } from "@/lib/db";
import {
  knowledge,
  todos,
  financialPlans,
  financialChildren,
  debts,
  stockPortfolio,
  foodRecipes,
  exercisePrograms,
  healthEntries,
  healthGoals,
  lifeProfiles,
  lifeStories,
  dailyQuotes,
  activities,
  pomodoroSessions,
  badHabits,
  chatSessions,
  chatMessages,
} from "@/lib/db/schema";
import { monthlySummary } from "@/lib/db/finance-repo";
import { getFeatureMeta } from "@/lib/chat-features";

/* ═══════════ Konteks fitur LifeOS Chat ═══════════ */

const clip = (s: string, n = 300) => (s.length > n ? s.slice(0, n) + "…" : s);

/** Bangun ringkasan data fitur dari DB — di-inject ke prompt AI. */
export function buildFeatureContext(feature: string): string {
  try {
    switch (feature) {
      case "knowledge": {
        const rows = db.select().from(knowledge).orderBy(desc(knowledge.id)).limit(10).all();
        if (rows.length === 0) return "Belum ada catatan Knowledge.";
        return rows.map((r) => `• ${r.title}: ${clip(r.content || "", 400)}`).join("\n");
      }
      case "todos": {
        const rows = db.select().from(todos).orderBy(desc(todos.id)).limit(20).all();
        if (rows.length === 0) return "Belum ada todo.";
        return rows.map((r) => `• [${r.status}] ${r.title}${r.dueDate ? ` (jatuh tempo ${r.dueDate})` : ""}${r.priority ? ` — prioritas ${r.priority}` : ""}`).join("\n");
      }
      case "finance": {
        const m = monthlySummary(new Date().toISOString().slice(0, 7));
        const cats = m.kategori.slice(0, 5).map((k) => `${k.nama}: ${k.total.toLocaleString("id-ID")}`).join(", ");
        return `Bulan ${m.bulan}: masuk ${m.masuk.toLocaleString("id-ID")}, keluar ${m.keluar.toLocaleString("id-ID")}, saldo ${m.saldo.toLocaleString("id-ID")}. Kategori: ${cats || "belum ada"}.`;
      }
      case "financial-planning": {
        const p = db.select().from(financialPlans).orderBy(sql`updated_at desc`).limit(1).get();
        if (!p) return "Belum ada profil financial planning.";
        const kids = db.select().from(financialChildren).all();
        const debtList = db.select().from(debts).where(eq(debts.type, "hutang")).all();
        const parts = [
          `Pemasukan ${p.monthlyIncome.toLocaleString("id-ID")}/bln, pengeluaran ${p.monthlyExpense.toLocaleString("id-ID")}/bln, tabungan ${p.monthlySavings.toLocaleString("id-ID")}/bln`,
          `Dana darurat ${p.emergencyCurrent.toLocaleString("id-ID")} dari target ${(p.monthlyExpense * p.emergencyMonths).toLocaleString("id-ID")}`,
          kids.length > 0 ? `Anak: ${kids.map((k) => `${k.name} (${k.age} th, ${k.schoolLevel}, biaya ${k.schoolCostYear.toLocaleString("id-ID")}/th)`).join("; ")}` : "",
          debtList.length > 0 ? `Cicilan: ${debtList.map((d) => `${d.party} ${d.amount.toLocaleString("id-ID")}${d.interestRate ? ` (bunga ${d.interestRate}%)` : ""}`).join("; ")}` : "Tidak ada cicilan",
        ];
        return parts.filter(Boolean).join(". ");
      }
      case "stocks": {
        const rows = db.select().from(stockPortfolio).all();
        if (rows.length === 0) return "Belum ada portofolio saham.";
        const totalInvested = rows.reduce((a, r) => a + r.lot * 100 * r.buyPrice, 0);
        return rows.map((r) => `• ${r.code}: ${r.lot} lot @ ${r.buyPrice.toLocaleString("id-ID")}${r.marketPrice ? ` (pasar ${r.marketPrice.toLocaleString("id-ID")})` : ""}`).join("\n") + `\nTotal investasi: ${totalInvested.toLocaleString("id-ID")}.`;
      }
      case "food": {
        const rows = db.select().from(foodRecipes).orderBy(desc(foodRecipes.id)).limit(5).all();
        return rows.length === 0 ? "Belum ada resep/makanan." : rows.map((r) => `• ${r.title}`).join("\n");
      }
      case "exercise": {
        const rows = db.select().from(exercisePrograms).orderBy(desc(exercisePrograms.id)).limit(5).all();
        return rows.length === 0 ? "Belum ada program olahraga." : rows.map((r) => `• ${r.program}`).join("\n");
      }
      case "health": {
        const entries = db.select().from(healthEntries).orderBy(desc(healthEntries.id)).limit(5).all();
        const goals = db.select().from(healthGoals).limit(5).all();
        const parts = [
          entries.length > 0 ? `Entri kesehatan terbaru: ${entries.map((e) => `tanggal ${e.date}`).join(", ")}` : "Belum ada entri kesehatan.",
          goals.length > 0
            ? `Goals kesehatan: ${goals.map((g) => [g.goalWeightKg ? `berat ${g.goalWeightKg} kg` : "", g.exercisePerWeekMinutes ? `olahraga ${g.exercisePerWeekMinutes} mnt/mgg` : "", g.sleepTargetHours ? `tidur ${g.sleepTargetHours} jam` : ""].filter(Boolean).join(", ")).join("; ")}`
            : "",
        ];
        return parts.filter(Boolean).join(". ");
      }
      case "life-story": {        const p = db.select().from(lifeProfiles).orderBy(desc(lifeProfiles.id)).limit(1).get();
        const stories = db.select().from(lifeStories).orderBy(desc(lifeStories.id)).limit(5).all();
        const parts: string[] = [];
        if (p) {
          const age = p.birthDate ? Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;
          parts.push(`Profil: lahir ${p.birthDate || "?"} (usia ±${age} th). Nilai: ${p.values || "-"}. Keluarga: ${p.family || "-"}`);
        }
        if (stories.length > 0) parts.push("Cerita terbaru: " + stories.map((s) => `${s.title} (usia ${s.age}, ${s.category})`).join("; "));
        return parts.length > 0 ? parts.join(". ") : "Belum ada profil atau cerita hidup.";
      }
      case "quotes": {
        const rows = db.select().from(dailyQuotes).orderBy(desc(dailyQuotes.id)).limit(5).all();
        return rows.length === 0 ? "Belum ada quote." : rows.map((r) => `• "${r.content}" — ${r.author || "LifeOS"}`).join("\n");
      }
      case "activity": {
        const rows = db.select().from(activities).orderBy(desc(activities.id)).limit(10).all();
        return rows.length === 0 ? "Belum ada aktivitas." : rows.map((r) => `• ${r.name}${r.durationMinutes ? ` (${r.durationMinutes} menit)` : ""}`).join("\n");
      }
      case "pomodoro": {
        const rows = db.select().from(pomodoroSessions).orderBy(desc(pomodoroSessions.id)).limit(10).all();
        if (rows.length === 0) return "Belum ada sesi pomodoro.";
        const total = rows.reduce((a, r) => a + (r.durationMinutes ?? 0), 0);
        return `${rows.length} sesi fokus terakhir, total ±${total} menit.`;
      }
      case "habits": {
        const rows = db.select().from(badHabits).limit(10).all();
        return rows.length === 0 ? "Belum ada target kebiasaan." : rows.map((r) => `• ${r.name}`).join("\n");
      }
      default:
        return "";
    }
  } catch (e) {
    return `(gagal memuat data: ${e instanceof Error ? e.message : "error"})`;
  }
}

/* ═══════════ Streaming chat ═══════════ */

export interface ChatMessageInput {
  role: "user" | "assistant";
  message: string;
}

/** Stream jawaban AI dengan konteks fitur + riwayat percakapan. */
export async function streamChat(input: {
  feature: string;
  history: ChatMessageInput[];
}): Promise<ReadableStream<string>> {
  const meta = getFeatureMeta(input.feature);
  const featureContext = buildFeatureContext(input.feature);
  const model = getChatModel();

  const system =
    buildSystemPrompt({ tone: "detail" }) +
    [
      "",
      `Kamu adalah asisten pribadi LifeOS. Konteks aktif: **${meta.label}**.`,
      featureContext
        ? `BERIKUT DATA DARI FITUR ${meta.label.toUpperCase()} (data nyata dari LifeOS — jawab berdasarkan ini saat ditanya hal yang ada di dalamnya):\n${featureContext}`
        : "Tidak ada data fitur yang tersedia untuk konteks ini.",
      "Aturan: jawab hangat & jelas dalam Bahasa Indonesia; gunakan markdown (bold, list, tabel) agar mudah dibaca; jika data tidak ada di konteks, jangan mengarang — katakan dengan jujur dan sarankan cara mengisinya di LifeOS.",
    ].join("\n");

  const historyText = input.history
    .slice(-12)
    .map((m) => `${m.role === "user" ? "USER" : "ASISTEN"}: ${m.message}`)
    .join("\n\n");

  const result = await streamText({
    model,
    system,
    prompt: historyText ? `Riwayat percakapan:\n${historyText}\n\nUSER: ${input.history[input.history.length - 1]?.message ?? ""}` : input.history[input.history.length - 1]?.message ?? "",
    temperature: 0.7,
  });
  return result.textStream;
}

/** Auto-title dari pesan pertama (heuristik — hemat, tanpa LLM). */
export function autoTitle(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "Percakapan baru";
  return clean.length > 48 ? clean.slice(0, 48) + "…" : clean;
}

/** Ambil riwayat pesan session (lazy load: sebelum id tertentu). */
export function getSessionMessages(sessionId: number, beforeId?: number, limit = 50) {
  const rows = beforeId
    ? db
        .select()
        .from(chatMessages)
        .where(and(eq(chatMessages.sessionId, sessionId), sql`${chatMessages.id} < ${beforeId}`))
        .orderBy(desc(chatMessages.id))
        .limit(limit)
        .all()
    : db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(desc(chatMessages.id)).limit(limit).all();
  return rows.reverse();
}

export function createSession(feature: string) {
  const row = db
    .insert(chatSessions)
    .values({ context: feature, title: "Percakapan baru" })
    .returning()
    .get();
  return row;
}

export function listSessions() {
  return db.select().from(chatSessions).orderBy(desc(chatSessions.updatedAt)).all();
}
