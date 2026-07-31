import { generateText } from "ai";
import { getModel } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { embedText, saveEmbedding } from "@/lib/ai/memory";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { embeddings, knowledge } from "@/lib/db/schema";

/**
 * AI post-processing untuk knowledge — dipanggil SETELAH catatan disimpan
 * (fire-and-forget, tidak memblokir respons API):
 *   1. Ringkasan otomatis (KNW-04) — hanya untuk konten ≥ 300 karakter
 *   2. Embedding / extended memory (KNW-05) — vector untuk semantic search
 *
 * Graceful: tanpa API key, proses dilewati tanpa error.
 */

export function hasAiConfig(): boolean {
  return Boolean(
    process.env.AI_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.OPENROUTER_API_KEY
  );
}

/** Pecah teks panjang jadi chunk ≤ 800 karakter (KNW-07 chunking) */
export function chunkText(text: string, maxChars = 800): string[] {
  const clean = text.trim();
  if (clean.length <= maxChars) return [clean];

  const chunks: string[] = [];
  let current = "";
  for (const sentence of clean.split(/(?<=[.!?])\s+/)) {
    if ((current + " " + sentence).trim().length > maxChars && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = (current + " " + sentence).trim();
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

/** Jalankan ringkasan + embedding untuk satu catatan (async, non-blocking) */
export async function processKnowledgeAI(id: number): Promise<void> {
  const row = db.select().from(knowledge).where(eq(knowledge.id, id)).get();
  if (!row) return;

  const content = `${row.title}. ${row.content}`.trim();
  const chunks = chunkText(content);

  // ── 1. Ringkasan AI (hanya konten cukup panjang) ──
  if (hasAiConfig() && content.length >= 300 && !row.summary) {
    try {
      const { text } = await generateText({
        model: getModel(),
        system: buildSystemPrompt({ tone: "ringkas" }),
        prompt: buildUserPrompt(
          "Buat ringkasan 2-3 kalimat dari catatan ini (Bahasa Indonesia).",
          content
        ),
        maxOutputTokens: 200,
      });
      await db
        .update(knowledge)
        .set({ summary: text.trim() })
        .where(eq(knowledge.id, id));
    } catch (err) {
      console.error("[AI] Gagal ringkasan knowledge", id, err);
    }
  }

  // ── 2. Embedding + simpan vector (extended memory) ──
  if (hasAiConfig()) {
    try {
      // Hapus embedding lama (kalau konten diupdate)
      await db
        .delete(embeddings)
        .where(
          and(
            eq(embeddings.sourceTable, "knowledge"),
            eq(embeddings.sourceId, id)
          )
        );

      for (let i = 0; i < chunks.length; i++) {
        const vector = await embedText(chunks[i]);
        await saveEmbedding({
          sourceTable: "knowledge",
          sourceId: id,
          chunkIndex: i,
          chunkText: chunks[i],
          vector,
        });
      }
    } catch (err) {
      console.error("[AI] Gagal embedding knowledge", id, err);
    }
  }
}
