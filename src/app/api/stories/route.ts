import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeStories } from "@/lib/db/schema";

const CATEGORIES = [
  "percintaan",
  "konflik",
  "keluarga",
  "karier",
  "pendidikan",
  "pertemanan",
  "kesehatan",
  "lainnya",
] as const;

/** GET /api/stories?age=20 — daftar cerita (opsional filter usia). */
export async function GET(req: NextRequest) {
  const age = Number(req.nextUrl.searchParams.get("age"));
  const rows = (
    age > 0
      ? db.select().from(lifeStories).where(eq(lifeStories.age, age))
      : db.select().from(lifeStories)
  )
    .orderBy(asc(lifeStories.age), desc(lifeStories.id))
    .all();

  const data = rows.map((r) => ({
    id: r.id,
    age: r.age,
    title: r.title,
    category: r.category,
    actors: r.actors ?? "",
    story: r.story,
    createdAt: r.createdAt,
  }));
  return NextResponse.json({ data });
}

/** POST /api/stories — tambah cerita. */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const title = String(b.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Judul cerita wajib diisi" }, { status: 400 });
    }
    const age = Number(b.age);
    const category = (CATEGORIES as readonly string[]).includes(String(b.category))
      ? String(b.category)
      : "lainnya";

    const row = db
      .insert(lifeStories)
      .values({
        age: Number.isFinite(age) && age > 0 ? Math.round(age) : 1,
        title,
        category,
        actors: String(b.actors || "").slice(0, 300),
        story: String(b.story || "").slice(0, 20000),
      })
      .returning()
      .get();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/stories error:", err);
    return NextResponse.json({ error: "Gagal menyimpan cerita" }, { status: 500 });
  }
}

/** PATCH /api/stories — perbarui cerita. */
export async function PATCH(req: NextRequest) {
  try {
    const b = await req.json();
    const id = Number(b.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }
    const existing = db.select().from(lifeStories).where(eq(lifeStories.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Cerita tidak ditemukan" }, { status: 404 });
    }

    const category = (CATEGORIES as readonly string[]).includes(String(b.category))
      ? String(b.category)
      : existing.category;

    const row = db
      .update(lifeStories)
      .set({
        age: b.age !== undefined && Number.isFinite(Number(b.age)) && Number(b.age) > 0
          ? Math.round(Number(b.age))
          : existing.age,
        title: b.title !== undefined ? String(b.title).trim() || existing.title : existing.title,
        category,
        actors: b.actors !== undefined ? String(b.actors).slice(0, 300) : existing.actors,
        story: b.story !== undefined ? String(b.story).slice(0, 20000) : existing.story,
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(lifeStories.id, id))
      .returning()
      .get();

    return NextResponse.json({ data: row });
  } catch (err) {
    console.error("PATCH /api/stories error:", err);
    return NextResponse.json({ error: "Gagal memperbarui cerita" }, { status: 500 });
  }
}
