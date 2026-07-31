import { generateText } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { db } from "@/lib/db";
import { todos } from "@/lib/db/schema";
import { maxPositionInColumn } from "@/lib/db/todo-repo";
import { BIG_TASK_THRESHOLD_MIN, isBigTask } from "@/lib/ai/breakdown-config";

export const BreakdownSchema = z.object({
  langkah: z.array(z.object({ judul: z.string(), estimasiMenit: z.number().optional() })).min(2).max(6),
});

export type Breakdown = z.infer<typeof BreakdownSchema>;

/** Pecah tugas besar jadi langkah-langkah kecil.
 *  LLM jika API key ada; heuristik (bagi rata) jika offline. */
export async function breakdownTodo(todoId: number): Promise<{
  ok: boolean;
  data?: { parentId: number; langkah: string[] };
  source: "ai" | "heuristik" | "not-found" | "not-big";
  error?: string;
}> {
  const todo = db.select().from(todos).where(eq(todos.id, todoId)).get();
  if (!todo) return { ok: false, source: "not-found", error: "Tugas tidak ditemukan" };
  if (!isBigTask(todo.estimateMinutes)) {
    return {
      ok: false,
      source: "not-big",
      error: `Tugas hanya ${todo.estimateMinutes ?? 0} menit — belum perlu dipecah (min ${BIG_TASK_THRESHOLD_MIN}).`,
    };
  }

  const totalMin = todo.estimateMinutes ?? 120;
  const heuristicSteps = (): Breakdown => {
    const n = Math.min(5, Math.max(2, Math.ceil(totalMin / 45)));
    const per = Math.round(totalMin / n);
    return {
      langkah: Array.from({ length: n }, (_, i) => ({
        judul: `Bagian ${i + 1} dari "${todo.title}"`,
        estimasiMenit: per,
      })),
    };
  };

  let breakdown: Breakdown | null = null;
  let source: "ai" | "heuristik" = "heuristik";

  try {
    const model = getModel();
    const system = buildSystemPrompt({ tone: "menyuruh" });
    const user = buildUserPrompt(
      `Pecah tugas besar berikut menjadi ${totalMin >= 180 ? 4 : 3}-5 langkah kecil yang bisa diselesaikan 20-60 menit. ` +
        "Setiap langkah harus konkret dan actionable (mulai kata kerja). " +
        "Output JSON: {\"langkah\":[{\"judul\":\"...\",\"estimasiMenit\":30}]}",
      JSON.stringify(
        {
          judul: todo.title,
          deskripsi: todo.description || "",
          estimasiTotalMenit: totalMin,
          area: todo.area || "",
        },
        null,
        2
      )
    );

    const { text } = await generateText({ model, system, prompt: user, temperature: 0.3 });
    const parsed = parseBreakdownJson(text);
    if (parsed && parsed.langkah.length >= 2) {
      breakdown = parsed;
      source = "ai";
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("AI_API_KEY")) {
      console.error("AI todo-breakdown error:", err);
    }
  }

  if (!breakdown) breakdown = heuristicSteps();

  // Simpan sub-tugas: status = status induk, area & prioritas ikut induk
  const status = todo.status === "done" ? "todo" : todo.status;
  const position = maxPositionInColumn(status);
  const now = new Date().toISOString();

  const inserted = db
    .insert(todos)
    .values(
      breakdown.langkah.map((l, i) => ({
        title: l.judul,
        description: `Sub-langkah ${i + 1} dari "${todo.title}"${source === "ai" ? " (AI)" : ""}`,
        priority: todo.priority,
        estimateMinutes: l.estimasiMenit ?? Math.max(30, Math.round(totalMin / breakdown!.langkah.length)),
        status,
        position: position + i,
        area: todo.area,
        parentId: todo.id,
        createdAt: now,
      }))
    )
    .returning()
    .all();

  return {
    ok: true,
    data: { parentId: todo.id, langkah: inserted.map((r) => r.title) },
    source,
  };
}

function parseBreakdownJson(text: string): Breakdown | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const parsed = BreakdownSchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
