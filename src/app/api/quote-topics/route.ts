import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quoteTopics } from "@/lib/db/schema";

const PERSONALITIES = ["bijak", "tegas", "lembut", "motivator", "spiritual"];

/** GET /api/quote-topics — daftar topik quotes (aktif dulu). */
export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all") === "1";
  const rows = all
    ? db.select().from(quoteTopics).orderBy(asc(quoteTopics.name)).all()
    : db.select().from(quoteTopics).where(eq(quoteTopics.active, true)).orderBy(asc(quoteTopics.name)).all();
  return NextResponse.json({ data: rows });
}

/** POST /api/quote-topics — tambah topik baru. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim().toLowerCase();
    if (!name) return NextResponse.json({ error: "Nama topik wajib diisi" }, { status: 400 });
    const personality = PERSONALITIES.includes(String(body.personality)) ? String(body.personality) : "bijak";
    const row = db
      .insert(quoteTopics)
      .values({ name, personality, description: String(body.description || "").slice(0, 200) })
      .returning()
      .get();
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Topik sudah ada / gagal menyimpan" }, { status: 500 });
  }
}
