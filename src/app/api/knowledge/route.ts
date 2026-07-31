import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  knowledge,
  knowledgeCategories,
  knowledgeTags,
  tags,
} from "@/lib/db/schema";
import { processKnowledgeAI } from "@/lib/ai/knowledge-pipeline";
import {
  getKnowledgeWithRelations,
  setKnowledgeCategories,
  setKnowledgeTags,
  type KnowledgeWithRelations,
} from "@/lib/db/knowledge-repo";

/** GET /api/knowledge — daftar catatan (opsional: ?q= & ?category= & ?tag= & ?sort=) */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const category = req.nextUrl.searchParams.get("category")?.trim() || "";
  const tag = req.nextUrl.searchParams.get("tag")?.trim() || "";
  const sort = req.nextUrl.searchParams.get("sort") || "terbaru";

  const orderBy =
    sort === "terlama"
      ? asc(knowledge.createdAt)
      : desc(knowledge.createdAt);

  // Filter via relasi (kategori/tag) → kumpulkan id yang cocok
  let relIds: number[] | null = null;
  if (category) {
    relIds = db
      .select({ id: knowledgeCategories.knowledgeId })
      .from(knowledgeCategories)
      .innerJoin(categories, eq(knowledgeCategories.categoryId, categories.id))
      .where(eq(categories.name, category))
      .all()
      .map((r) => r.id);
  }
  if (tag) {
    const tagIds = db
      .select({ id: knowledgeTags.knowledgeId })
      .from(knowledgeTags)
      .innerJoin(tags, eq(knowledgeTags.tagId, tags.id))
      .where(eq(tags.name, tag))
      .all()
      .map((r) => r.id);
    relIds = relIds ? relIds.filter((id) => tagIds.includes(id)) : tagIds;
  }

  let rows;
  if (relIds) {
    if (relIds.length === 0) return NextResponse.json({ data: [] });
    rows = db
      .select()
      .from(knowledge)
      .where(
        and(
          inArray(knowledge.id, relIds),
          q
            ? or(
                like(knowledge.title, `%${q}%`),
                like(knowledge.content, `%${q}%`)
              )
            : undefined
        )
      )
      .orderBy(orderBy)
      .all();
  } else if (q) {
    rows = db
      .select()
      .from(knowledge)
      .where(or(like(knowledge.title, `%${q}%`), like(knowledge.content, `%${q}%`)))
      .orderBy(orderBy)
      .all();
  } else {
    rows = db.select().from(knowledge).orderBy(orderBy).all();
  }

  return NextResponse.json({ data: rows.map(attach) });
}

/** POST /api/knowledge — tambah catatan baru */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();

    if (!title) {
      return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
    }

    const row = db
      .insert(knowledge)
      .values({
        title,
        content,
        source: String(body.source || "").trim(),
      })
      .returning()
      .get();

    // Relasi kategori & tags
    setKnowledgeCategories(row.id, Array.isArray(body.categories) ? body.categories : []);
    setKnowledgeTags(row.id, Array.isArray(body.tags) ? body.tags : []);

    // AI post-processing async (ringkasan + embedding) — tidak memblokir
    void processKnowledgeAI(row.id).catch((err) =>
      console.error("[AI] pipeline gagal:", err)
    );

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/knowledge error:", err);
    return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
  }
}

function attach(row: typeof knowledge.$inferSelect): KnowledgeWithRelations {
  const withRel = getKnowledgeWithRelations(row.id);
  return withRel ?? {
    id: row.id,
    title: row.title,
    content: row.content,
    source: row.source,
    summary: row.summary,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    categories: [],
    tags: [],
  };
}
