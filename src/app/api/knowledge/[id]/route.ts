import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { knowledge } from "@/lib/db/schema";
import {
  getKnowledgeWithRelations,
  setKnowledgeCategories,
  setKnowledgeTags,
} from "@/lib/db/knowledge-repo";
import { processKnowledgeAI } from "@/lib/ai/knowledge-pipeline";

type Params = { params: Promise<{ id: string }> };

/** GET /api/knowledge/[id] — detail satu catatan + relasi */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = getKnowledgeWithRelations(Number(id));

  if (!row) {
    return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}

/** PATCH /api/knowledge/[id] — update catatan + relasi */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await req.json();
    const row = db
      .update(knowledge)
      .set({
        ...(body.title !== undefined ? { title: String(body.title) } : {}),
        ...(body.content !== undefined ? { content: String(body.content) } : {}),
        ...(body.source !== undefined ? { source: String(body.source) } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(knowledge.id, Number(id)))
      .returning()
      .get();

    if (!row) {
      return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
    }

    // Update relasi kalau dikirim
    if (Array.isArray(body.categories)) {
      setKnowledgeCategories(row.id, body.categories);
    }
    if (Array.isArray(body.tags)) {
      setKnowledgeTags(row.id, body.tags);
    }

    // Re-process AI (ringkasan & embedding baru)
    void processKnowledgeAI(row.id).catch((err) =>
      console.error("[AI] pipeline gagal:", err)
    );

    return NextResponse.json({ data: getKnowledgeWithRelations(row.id) });
  } catch (err) {
    console.error("PATCH /api/knowledge error:", err);
    return NextResponse.json({ error: "Gagal memperbarui" }, { status: 500 });
  }
}

/** DELETE /api/knowledge/[id] — hapus catatan (relasi ikut cascade) */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db
    .delete(knowledge)
    .where(eq(knowledge.id, Number(id)))
    .returning()
    .get();

  if (!row) {
    return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}
