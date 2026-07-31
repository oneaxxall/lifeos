import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { businessIdeas } from "@/lib/db/schema";

/** GET /api/business/ideas — daftar ide */
export async function GET() {
  const rows = db.select().from(businessIdeas).orderBy(desc(businessIdeas.createdAt)).all();
  return NextResponse.json({ data: rows });
}

/** POST /api/business/ideas — tangkap ide cepat (BIZ-01) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Judul ide kosong" }, { status: 400 });
    }
    const row = db
      .insert(businessIdeas)
      .values({
        title,
        description: String(body.description || ""),
        status: String(body.status || "baru"),
      })
      .returning()
      .get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/business/ideas error:", err);
    return NextResponse.json({ error: "Gagal menyimpan ide" }, { status: 500 });
  }
}
