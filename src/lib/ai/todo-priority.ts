import { generateText } from "ai";
import { z } from "zod";
import { ne } from "drizzle-orm";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { db } from "@/lib/db";
import { todos } from "@/lib/db/schema";
import type { Todo } from "@/lib/db/schema";

/** Daftar tugas yang masih aktif (belum done), diurutkan utk konteks AI */
export function getActiveTodos(): Todo[] {
  return db
    .select()
    .from(todos)
    .where(ne(todos.status, "done"))
    .all()
    .sort((a, b) => {
      // Prioritas: tinggi > sedang > rendah, lalu due date terdekat
      const prioRank = { tinggi: 0, sedang: 1, rendah: 2 } as const;
      const pa = prioRank[(a.priority as keyof typeof prioRank) ?? "sedang"];
      const pb = prioRank[(b.priority as keyof typeof prioRank) ?? "sedang"];
      if (pa !== pb) return pa - pb;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.position - b.position;
    });
}

export const TodoPrioritySchema = z.object({
  prioritas: z
    .array(
      z.object({
        judul: z.string(),
        alasan: z.string(),
        estimasiMenit: z.number().optional(),
      })
    )
    .max(3),
  ringkasan: z.string(),
});

export type TodoPriority = z.infer<typeof TodoPrioritySchema>;

/** Konteks tugas utk AI — ringkas, fokus pada fakta yang bisa dipakai */
function buildTodoContext(todosList: Todo[]): string {
  const today = new Date().toISOString().slice(0, 10);

  const rows = todosList.map((t) => {
    const parts = [`- ${t.title}`];
    if (t.priority) parts.push(`prioritas:${t.priority}`);
    if (t.area) parts.push(`area:${t.area}`);
    if (t.dueDate) {
      const overdue = t.dueDate < today ? " (TERLAMBAT)" : "";
      parts.push(`due:${t.dueDate}${overdue}`);
    }
    if (t.estimateMinutes) parts.push(`estimasi:${t.estimateMinutes} menit`);
    if (t.description) parts.push(`deskripsi:${t.description.slice(0, 120)}`);
    return parts.join(" | ");
  });

  return `Hari ini: ${today}\nDaftar tugas aktif:\n${rows.join("\n")}`;
}

/**
 * Saran prioritas AI — pilih 3 tugas terpenting hari ini + alasan.
 * Fallback: jika API key belum ada, gunakan heuristik lokal (tanpa LLM).
 */
export async function suggestTodoPriority(): Promise<{
  ok: boolean;
  data?: TodoPriority;
  source: "ai" | "heuristik" | "kosong";
  error?: string;
}> {
  const active = getActiveTodos();
  if (active.length === 0) {
    return { ok: true, source: "kosong" };
  }

  // Heuristik lokal — pilih 3 berdasarkan prioritas + overdue (fallback tanpa API key)
  const heuristik: TodoPriority = {
    prioritas: active.slice(0, 3).map((t) => ({
      judul: t.title,
      alasan: buildHeuristicReason(t),
      estimasiMenit: t.estimateMinutes || undefined,
    })),
    ringkasan: "Urutan berdasar prioritas & tenggat (mode offline — set AI_API_KEY utk saran cerdas).",
  };

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "menyuruh" });
    const user = buildUserPrompt(
      "Pilih 3 tugas PALING PENTING yang harus dikerjakan hari ini dari daftar. " +
        "Pertimbangkan: tenggat (terutama yang terlambat), prioritas, durasi, dan ketergantungan. " +
        "Beri alasan singkat per tugas (maks 2 kalimat) dan estimasi menit. " +
        "Output JSON: {\"prioritas\":[{\"judul\":\"...\",\"alasan\":\"...\",\"estimasiMenit\":30}], \"ringkasan\":\"1 kalimat rencana\"}",
      buildTodoContext(active)
    );

    const { text } = await generateText({
      model,
      system,
      prompt: user,
      temperature: 0.3,
    });
    const parsed = parsePriorityJson(text);
    if (parsed) {
      return { ok: true, data: parsed, source: "ai" };
    }
    // LLM output tidak ter-parse → fallback heuristik
    return { ok: true, data: heuristik, source: "heuristik" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AI_API_KEY")) {
      return { ok: true, data: heuristik, source: "heuristik" };
    }
    console.error("AI todo-priority error:", err);
    return { ok: true, data: heuristik, source: "heuristik" };
  }
}

function buildHeuristicReason(t: Todo): string {
  const today = new Date().toISOString().slice(0, 10);
  if (t.dueDate && t.dueDate < today) {
    return `Sudah terlambat dari ${t.dueDate} — selesaikan segera.`;
  }
  if (t.dueDate && t.dueDate === today) return "Tenggat hari ini.";
  if (t.priority === "tinggi") return "Prioritas tinggi — berdampak besar.";
  if (t.priority === "rendah") return "Prioritas rendah, bisa diselesaikan cepat.";
  return "Prioritas sedang.";
}

/** Parse JSON dari output LLM — toleran thd markdown fence / teks ekstra */
export function parsePriorityJson(text: string): TodoPriority | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const parsed = TodoPrioritySchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
