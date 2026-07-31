import { generateText } from "ai";
import { z } from "zod";
import { asc, desc } from "drizzle-orm";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { db } from "@/lib/db";
import { teamMembers, teamOneOnOnes } from "@/lib/db/schema";

export const TeamInsightSchema = z.object({
  ringkasanTim: z.string(),
  perhatian: z.array(
    z.object({
      nama: z.string(),
      sinyal: z.string(),
      saran: z.string(),
    })
  ),
  persiapan: z.array(
    z.object({
      nama: z.string(),
      ringkasan: z.string(),
      actionItemPending: z.string(),
      saranMulai: z.string(),
    })
  ),
  ringkasan: z.string(),
});

export type TeamInsight = z.infer<typeof TeamInsightSchema>;

/** Konteks AI: anggota + riwayat 1-on-1 (maks 3 sesi per anggota) */
function buildTeamContext(): string {
  const members = db.select().from(teamMembers).orderBy(asc(teamMembers.name)).all();
  const onones = db.select().from(teamOneOnOnes).orderBy(desc(teamOneOnOnes.date)).all();

  const lines = members.map((m) => {
    const history = onones
      .filter((o) => o.memberId === m.id)
      .slice(0, 3)
      .map(
        (o) =>
          `  - ${o.date}: topik="${o.topics || "-"}" | action: ${o.actionItems || "-"}${o.notes ? ` | catatan: ${o.notes}` : ""}`
      )
      .join("\n");
    return `- ${m.name} (${m.seniority}, ${m.role || "-"})${m.strengths ? `, kuat: ${m.strengths}` : ""}\n${history || "  (belum ada 1-on-1)"}`;
  });

  return [`TIM:`, lines.join("\n"), ``].join("\n");
}

/** Analisa tim AI — ringkasan, deteksi dini, persiapan 1-on-1 (TE-03/04). Fallback heuristik. */
export async function analyzeTeam(): Promise<{
  ok: boolean;
  data: TeamInsight | null;
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  const members = db.select().from(teamMembers).orderBy(asc(teamMembers.name)).all();
  if (members.length === 0) {
    return { ok: true, data: null, source: "kosong" };
  }

  // Heuristik lokal tanpa LLM
  const heuristik = buildHeuristic();

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Kamu adalah asisten manajemen untuk seorang Software Engineering Manager. " +
        "Analisa data tim dan output JSON: " +
        "{\"ringkasanTim\":\"1-2 kalimat kondisi tim secara keseluruhan\", " +
        "\"perhatian\":[{\"nama\":\"...\",\"sinyal\":\"pola yang perlu diperhatikan\",\"saran\":\"tindakan manajemen\"}], " +
        "\"persiapan\":[{\"nama\":\"...\",\"ringkasan\":\"riwayat 1-on-1 terakhir\",\"actionItemPending\":\"action item yang belum jelas selesai\",\"saranMulai\":\"cara membuka 1-on-1 berikutnya\"}], " +
        "\"ringkasan\":\"1 kalimat\"}. " +
        "Maks 3 perhatian + 3 persiapan (anggota dengan riwayat 1-on-1 terbanyak dulu). " +
        "Bahasa profesional tapi hangat. Jaga privasi — data internal tim.",
      buildTeamContext()
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
    console.error("AI team error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

function buildHeuristic(): TeamInsight {
  const members = db.select().from(teamMembers).orderBy(asc(teamMembers.name)).all();
  const onones = db.select().from(teamOneOnOnes).orderBy(desc(teamOneOnOnes.date)).all();

  // Persiapan: anggota dengan riwayat terbanyak
  const byHistory = members
    .map((m) => ({ member: m, history: onones.filter((o) => o.memberId === m.id) }))
    .sort((a, b) => b.history.length - a.history.length);

  const persiapan = byHistory
    .filter((x) => x.history.length > 0)
    .slice(0, 3)
    .map((x) => {
      const latest = x.history[0];
      const pending = latest.actionItems?.trim()
        ? latest.actionItems.split("\n")[0]
        : "tidak ada action item tercatat";
      return {
        nama: x.member.name,
        ringkasan: `1-on-1 terakhir ${latest.date}: ${latest.topics || "topik umum"}`,
        actionItemPending: pending,
        saranMulai: `Tanya kabar dulu, lalu cek progres "${pending.slice(0, 40)}".`,
      };
    });

  // Perhatian: anggota tanpa 1-on-1 dalam 30 hari
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const perhatian = members
    .map((m) => {
      const last = onones.find((o) => o.memberId === m.id);
      const stale = !last || last.date < monthAgo;
      return { m, stale, last };
    })
    .filter((x) => x.stale)
    .map((x) => ({
      nama: x.m.name,
      sinyal: x.last
        ? `1-on-1 terakhir ${x.last.date} — sudah >30 hari.`
        : "Belum ada catatan 1-on-1.",
      saran: "Jadwalkan 1-on-1 minggu ini untuk menjaga komunikasi.",
    }))
    .slice(0, 3);

  return {
    ringkasanTim: `${members.length} anggota, ${onones.length} sesi 1-on-1 tercatat.`,
    perhatian,
    persiapan,
    ringkasan: "Mode offline — set AI_API_KEY untuk analisa tim mendalam.",
  };
}

function parseInsightJson(text: string): TeamInsight | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const parsed = TeamInsightSchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
