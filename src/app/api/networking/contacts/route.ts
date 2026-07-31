import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";

/** GET /api/networking/contacts — daftar kontak */
export async function GET() {
  const rows = db.select().from(contacts).orderBy(asc(contacts.name)).all();
  return NextResponse.json({ data: rows });
}

/** POST /api/networking/contacts — catat kontak baru (NW-01) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama kontak kosong" }, { status: 400 });
    }
    const row = db
      .insert(contacts)
      .values({
        name,
        role: String(body.role || ""),
        company: String(body.company || ""),
        context: String(body.context || ""),
        interests: String(body.interests || ""),
        priority: String(body.priority || "sedang"),
        lastContact: String(body.lastContact || ""),
      })
      .returning()
      .get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/networking/contacts error:", err);
    return NextResponse.json({ error: "Gagal menyimpan kontak" }, { status: 500 });
  }
}
