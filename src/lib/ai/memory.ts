import { embed, embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { embeddings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Extended Memory — menyimpan & mencari vector (embedding) dari knowledge.
 *
 * Catatan v1: vector disimpan sebagai JSON BLOB di tabel `embeddings`.
 * Pencarian kemiripan memakai cosine similarity di JS (cukup untuk
 * ribuan catatan personal). sqlite-vec bisa menggantikan ini tanpa
 * mengubah API — lihat planning/00-fondasi.md (FND-05).
 */

const EMBED_MODEL = process.env.AI_EMBED_MODEL || "text-embedding-3-small";
const EMBED_DIMS = 1536;

function getEmbeddingModel() {
  const apiKey =
    process.env.AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    "";
  const baseURL = process.env.AI_EMBED_BASE_URL || process.env.AI_BASE_URL;

  if (!apiKey) {
    throw new Error("AI_API_KEY belum di-set untuk embedding.");
  }

  const openai = createOpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  return openai.textEmbeddingModel(EMBED_MODEL);
}

/** Buat vector untuk satu teks */
export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: text,
  });
  return embedding;
}

/** Simpan embedding untuk satu chunk knowledge */
export async function saveEmbedding(params: {
  sourceTable: string;
  sourceId: number;
  chunkIndex: number;
  chunkText: string;
  vector: number[];
}): Promise<void> {
  await db.insert(embeddings).values({
    sourceTable: params.sourceTable,
    sourceId: params.sourceId,
    chunkIndex: params.chunkIndex,
    chunkText: params.chunkText,
    model: EMBED_MODEL,
    vector: JSON.stringify(params.vector),
  });
}

/** Cosine similarity antara dua vector */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Cari N chunk paling mirip dengan query (semantic search) */
export async function semanticSearch(
  query: string,
  limit = 5
): Promise<Array<{ chunkText: string; score: number; sourceTable: string; sourceId: number }>> {
  const queryVector = await embedText(query);
  const all = await db.select().from(embeddings).all();

  return all
    .map((row) => {
      let vec: number[] = [];
      try {
        vec = JSON.parse(row.vector);
      } catch {
        vec = [];
      }
      return {
        chunkText: row.chunkText,
        sourceTable: row.sourceTable,
        sourceId: row.sourceId,
        score: cosineSimilarity(queryVector, vec),
      };
    })
    .filter((r) => r.score > 0.25) // ambang relevansi
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Hapus semua embedding milik satu sumber (saat konten diedit/dihapus) */
export async function deleteEmbeddingsFor(
  sourceTable: string,
  sourceId: number
): Promise<void> {
  await db
    .delete(embeddings)
    .where(
      and(
        eq(embeddings.sourceTable, sourceTable),
        eq(embeddings.sourceId, sourceId)
      )
    );
}

export { eq, and };
