import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, tags } from "@/lib/db/schema";

/** GET /api/knowledge/labels — daftar kategori & tags yang sudah ada (untuk autocomplete) */
export async function GET() {
  const cats = db.select().from(categories).orderBy(asc(categories.name)).all();
  const tgs = db.select().from(tags).orderBy(asc(tags.name)).all();
  return NextResponse.json({
    data: {
      categories: cats.map((c) => ({ id: c.id, name: c.name })),
      tags: tgs.map((t) => ({ id: t.id, name: t.name })),
    },
  });
}
