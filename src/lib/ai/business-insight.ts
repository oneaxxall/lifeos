import { generateText } from "ai";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { db } from "@/lib/db";
import { businessIdeas, businessProjects, todos } from "@/lib/db/schema";

export const BusinessPrioritySchema = z.object({
  prioritas: z.array(
    z.object({
      proyek: z.string(),
      alasan: z.string(),
      saran: z.string(),
    })
  ),
  fokus: z.string(),
  ringkasan: z.string(),
});

export type BusinessPriority = z.infer<typeof BusinessPrioritySchema>;

export const ExecutionPlanSchema = z.object({
  langkah: z.array(
    z.object({
      judul: z.string(),
      estimasi: z.string(),
      detail: z.string(),
    })
  ),
  ringkasan: z.string(),
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

/** Konteks AI: proyek aktif + ide + target */
function buildProjectContext(): string {
  const projects = db.select().from(businessProjects).orderBy(desc(businessProjects.createdAt)).all();
  const ideas = db.select().from(businessIdeas).orderBy(desc(businessIdeas.createdAt)).limit(10).all();

  const projectLines = projects
    .map((p) => {
      const deadline = p.deadline ? `, deadline ${p.deadline}` : "";
      return `- [${p.active ? "aktif" : "paused"}] "${p.name}" | tahap ${p.stage} | target: ${p.target || "-"}${deadline}`;
    })
    .join("\n");

  const ideaLines = ideas
    .map((i) => `- [${i.status}] "${i.title}" — ${i.description || "-"}`)
    .join("\n");

  return [
    `PROYEK:`,
    projectLines || "  (belum ada proyek)",
    ``,
    `IDE:`,
    ideaLines || "  (belum ada ide)",
  ].join("\n");
}

/** AI: prioritas proyek mingguan (BIZ-04). Fallback heuristik. */
export async function analyzeBusinessPriority(): Promise<{
  ok: boolean;
  data: BusinessPriority | null;
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  const projects = db.select().from(businessProjects).where(eq(businessProjects.active, true)).all();
  if (projects.length === 0) {
    return { ok: true, data: null, source: "kosong" };
  }

  // Heuristik lokal tanpa LLM
  const heuristik = buildPriorityHeuristic(projects);

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Kamu adalah penasihat bisnis untuk seorang Software Engineering Manager yang punya banyak proyek. " +
        "Analisa prioritas proyek minggu ini. Output JSON: " +
        "{\"prioritas\":[{\"proyek\":\"nama\",\"alasan\":\"data-driven (tahap, deadline, potensi)\",\"saran\":\"langkah minggu ini\"}], " +
        "\"fokus\":\"1 proyek yang paling layak didahulukan minggu ini + alasannya\", " +
        "\"ringkasan\":\"1 kalimat\"}. " +
        "Maks 3 proyek. Prioritaskan yang aktif dengan deadline dekat / tahap lanjut.",
      buildProjectContext()
    );

    const { text } = await generateText({ model, system, prompt: user, temperature: 0.3 });
    const parsed = parsePriorityJson(text);
    if (parsed) {
      return { ok: true, data: parsed, source: "ai" };
    }
    return { ok: true, data: heuristik, source: "heuristik" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      return { ok: true, data: heuristik, source: "heuristik" };
    }
    console.error("AI business priority error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

/** AI: langkah eksekusi 30 hari dari ide (BIZ-03). Fallback heuristik. */
export async function generateExecutionPlan(idea: {
  title: string;
  description?: string;
}): Promise<{ ok: boolean; data: ExecutionPlan; source: "ai" | "heuristik" }> {
  // Heuristik lokal tanpa LLM
  const heuristik = buildPlanHeuristic(idea);

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "detail" });
    const user = buildUserPrompt(
      "Kamu adalah penasihat bisnis. Susun rencana eksekusi 30 HARI PERTAMA untuk ide bisnis berikut. " +
        "Output JSON: {\"langkah\":[{\"judul\":\"mulai dengan kata kerja\",\"estimasi\":\"2-3 hari\",\"detail\":\"1 kalimat konkret\"}], " +
        "\"ringkasan\":\"1 kalimat\"}. " +
        "5-8 langkah realistis untuk eksekusi bertahap (riset → validasi → prototipe → peluncuran awal).",
      JSON.stringify(idea, null, 2)
    );

    const { text } = await generateText({ model, system, prompt: user, temperature: 0.4 });
    const parsed = parsePlanJson(text);
    if (parsed) {
      return { ok: true, data: parsed, source: "ai" };
    }
    return { ok: true, data: heuristik, source: "heuristik" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      return { ok: true, data: heuristik, source: "heuristik" };
    }
    console.error("AI business plan error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

/** Kirim langkah eksekusi ke Todo (tabel todos) */
export function pushPlanToTodos(plan: ExecutionPlan, ideaTitle: string): number {
  const rows = plan.langkah.map((langkah) =>
    db
      .insert(todos)
      .values({
        title: langkah.judul,
        description: langkah.detail,
        status: "backlog",
        position: 0,
        area: "bisnis",
      })
      .returning()
      .get()
  );
  void ideaTitle;
  return rows.length;
}

function buildPriorityHeuristic(
  projects: { name: string; stage: string | null; deadline: string | null; active: boolean }[]
): BusinessPriority {
  const sorted = [...projects].sort((a, b) => {
    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return aDeadline - bDeadline;
  });

  const priorities = sorted.slice(0, 3).map((p) => ({
    proyek: p.name,
    alasan: `Tahap ${p.stage}${p.deadline ? `, deadline ${p.deadline}` : ""}`,
    saran: `Alokasikan waktu minggu ini untuk memajukan tahap "${p.stage}".`,
  }));

  return {
    prioritas: priorities,
    fokus: sorted[0]
      ? `Fokus utama: "${sorted[0].name}" — ${sorted[0].deadline ? `deadline ${sorted[0].deadline}` : "proyek paling dekat dengan tahap lanjut"}.`
      : "Belum ada proyek aktif.",
    ringkasan: "Mode offline — set AI_API_KEY untuk analisa prioritas mendalam.",
  };
}

function buildPlanHeuristic(idea: { title: string; description?: string }): ExecutionPlan {
  const langkah = [
    { judul: `Riset pasar & kompetitor untuk "${idea.title}"`, estimasi: "3 hari", detail: "Identifikasi 5 kompetitor serupa + pelajaran yang bisa dipakai." },
    { judul: "Validasi masalah calon user", estimasi: "5 hari", detail: "Wawancara 5-10 calon user tentang masalah yang ingin dipecahkan." },
    { judul: "Landing page uji minat", estimasi: "3 hari", detail: "Buat halaman sederhana + form daftar minat, sebar ke komunitas." },
    { judul: "Definisikan MVP 1 fitur", estimasi: "4 hari", detail: "Pilih 1 fitur inti yang paling memecahkan masalah." },
    { judul: "Prototipe MVP", estimasi: "7 hari", detail: "Bangun prototipe fungsional satu fitur inti." },
    { judul: "Uji coba dengan 10 user", estimasi: "5 hari", detail: "Minta feedback, catat apa yang berhasil & tidak." },
    { judul: "Evaluasi & keputusan lanjut", estimasi: "3 hari", detail: "Analisa hasil uji coba — lanjut, pivot, atau stop." },
  ];
  return { langkah, ringkasan: "Rencana 30 hari: riset → validasi → MVP → uji user." };
}

function parsePriorityJson(text: string): BusinessPriority | null {
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const parsed = BusinessPrioritySchema.safeParse(JSON.parse(cleaned.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function parsePlanJson(text: string): ExecutionPlan | null {
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const parsed = ExecutionPlanSchema.safeParse(JSON.parse(cleaned.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
