import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  knowledge,
  knowledgeCategories,
  knowledgeTags,
  tags,
} from "@/lib/db/schema";

export interface KnowledgeWithRelations {
  id: number;
  title: string;
  content: string;
  source: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  categories: { id: number; name: string }[];
  tags: { id: number; name: string }[];
}

/** Normalisasi nama kategori/tag: lowercase + trim, kosong → null */
export function normalizeName(raw: string): string | null {
  const n = raw.trim().toLowerCase();
  return n.length > 0 ? n : null;
}

/** find-or-create satu kategori, return id */
export function findOrCreateCategory(name: string): number {
  const n = normalizeName(name);
  if (!n) throw new Error("Nama kategori kosong");
  const existing = db
    .select()
    .from(categories)
    .where(eq(categories.name, n))
    .get();
  if (existing) return existing.id;
  const row = db
    .insert(categories)
    .values({ name: n })
    .onConflictDoNothing()
    .returning()
    .get();
  if (row) return row.id;
  // conflict → ambil ulang
  return db.select().from(categories).where(eq(categories.name, n)).get()!.id;
}

/** find-or-create satu tag, return id */
export function findOrCreateTag(name: string): number {
  const n = normalizeName(name);
  if (!n) throw new Error("Nama tag kosong");
  const existing = db.select().from(tags).where(eq(tags.name, n)).get();
  if (existing) return existing.id;
  const row = db
    .insert(tags)
    .values({ name: n })
    .onConflictDoNothing()
    .returning()
    .get();
  if (row) return row.id;
  return db.select().from(tags).where(eq(tags.name, n)).get()!.id;
}

/** Set relasi knowledge ↔ kategori (hapus lama, insert baru) */
export function setKnowledgeCategories(knowledgeId: number, names: string[]): void {
  db.delete(knowledgeCategories)
    .where(eq(knowledgeCategories.knowledgeId, knowledgeId))
    .run();
  for (const name of names) {
    const n = normalizeName(name);
    if (!n) continue;
    const categoryId = findOrCreateCategory(n);
    db.insert(knowledgeCategories)
      .values({ knowledgeId, categoryId })
      .onConflictDoNothing()
      .run();
  }
}

/** Set relasi knowledge ↔ tags (hapus lama, insert baru) */
export function setKnowledgeTags(knowledgeId: number, names: string[]): void {
  db.delete(knowledgeTags)
    .where(eq(knowledgeTags.knowledgeId, knowledgeId))
    .run();
  for (const name of names) {
    const n = normalizeName(name);
    if (!n) continue;
    const tagId = findOrCreateTag(n);
    db.insert(knowledgeTags)
      .values({ knowledgeId, tagId })
      .onConflictDoNothing()
      .run();
  }
}

/** Ambil satu knowledge + relasi kategori & tags */
export function getKnowledgeWithRelations(id: number): KnowledgeWithRelations | null {
  const row = db.select().from(knowledge).where(eq(knowledge.id, id)).get();
  if (!row) return null;
  return attachRelations(row);
}

/** Ambil semua knowledge + relasi (urut terbaru) */
export function listKnowledgeWithRelations(): KnowledgeWithRelations[] {
  const rows = db
    .select()
    .from(knowledge)
    .orderBy(desc(knowledge.createdAt))
    .all();
  return rows.map(attachRelations);
}

/** Lampirkan relasi ke satu baris knowledge */
function attachRelations(row: KnowledgeRow): KnowledgeWithRelations {
  const cats = db
    .select({ id: categories.id, name: categories.name })
    .from(knowledgeCategories)
    .innerJoin(categories, eq(knowledgeCategories.categoryId, categories.id))
    .where(eq(knowledgeCategories.knowledgeId, row.id))
    .all();
  const tgs = db
    .select({ id: tags.id, name: tags.name })
    .from(knowledgeTags)
    .innerJoin(tags, eq(knowledgeTags.tagId, tags.id))
    .where(eq(knowledgeTags.knowledgeId, row.id))
    .all();

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    source: row.source,
    summary: row.summary,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    categories: cats,
    tags: tgs,
  };
}

type KnowledgeRow = typeof knowledge.$inferSelect;