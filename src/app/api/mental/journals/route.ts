import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema";
import { listJournals } from "@/lib/db/mental-repo";

/** GET /api/mental/journals — daftar jurnal */
export async function GET() {
  return NextResponse.json({ data: listJournals() });
}

/** POST /api/mental/journals — tulis jurnal + prompt refleksi (MEN-02) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content = String(body.content || "").trim();
    if (!content) {
      return NextResponse.json({ error: "Isi jurnal kosong" }, { status: 400 });
    }
    const row = db
      .insert(journalEntries)
      .values({
        content,
        date: String(body.date || new Date().toISOString().slice(0, 10)),
        prompt: String(body.prompt || ""),
      })
      .returning()
      .get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/mental/journals error:", err);
    return NextResponse.json({ error: "Gagal menyimpan jurnal" }, { status: 500 });
  }
}
