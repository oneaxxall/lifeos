import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/* ═══════════ Knowledge (Second Brain) ═══════════ */

export const knowledge = sqliteTable("knowledge", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  category: text("category").notNull().default("umum"),
  tags: text("tags").notNull().default(""), // comma-separated
  source: text("source").default(""),
  summary: text("summary").default(""), // diisi AI
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Todo ═══════════ */

export const todos = sqliteTable("todos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").default(""),
  priority: text("priority", { enum: ["tinggi", "sedang", "rendah"] })
    .notNull()
    .default("sedang"),
  dueDate: text("due_date").default(""), // ISO date
  estimateMinutes: integer("estimate_minutes").default(0),
  status: text("status", { enum: ["belum", "selesai", "tertunda"] })
    .notNull()
    .default("belum"),
  area: text("area").default(""), // kerja, keluarga, kesehatan, dll.
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  completedAt: text("completed_at").default(""),
});

/* ═══════════ Insight Feedback (AI belajar) ═══════════ */

export const insightFeedback = sqliteTable("insight_feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(), // fitur asal insight
  insightText: text("insight_text").notNull(),
  action: text("action", { enum: ["dilakukan", "diabaikan"] }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Vector (Extended Memory AI) ═══════════
 * Disimpan sebagai BLOB JSON — diproses oleh lib/ai/memory.ts.
 * (sqlite-vec native bisa ditambahkan belakangan tanpa ubah schema ini)
 */

export const embeddings = sqliteTable("embeddings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceTable: text("source_table").notNull(), // "knowledge" | "todo" | ...
  sourceId: integer("source_id").notNull(),
  model: text("model").notNull(),
  chunkIndex: integer("chunk_index").notNull().default(0),
  chunkText: text("chunk_text").notNull(),
  vector: text("vector").notNull(), // JSON array angka
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Knowledge = typeof knowledge.$inferSelect;
export type Todo = typeof todos.$inferSelect;
export type Embedding = typeof embeddings.$inferSelect;
