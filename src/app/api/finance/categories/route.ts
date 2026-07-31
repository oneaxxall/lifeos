import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { financeCategories } from "@/lib/db/schema";

/** GET /api/finance/categories — daftar kategori (dropdown/autocomplete) */
export async function GET() {
  const rows = db
    .select()
    .from(financeCategories)
    .orderBy(asc(financeCategories.name))
    .all();
  return NextResponse.json({ data: rows });
}

/** POST /api/finance/categories — buat kategori baru */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }
    const type = body.type === "masuk" ? "masuk" : "keluar";
    const row = db
      .insert(financeCategories)
      .values({
        name: name.toLowerCase(),
        type,
        icon: String(body.icon || ""),
      })
      .returning()
      .get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Kategori sudah ada" }, { status: 409 });
  }
}
