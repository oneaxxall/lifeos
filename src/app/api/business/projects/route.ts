import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { businessProjects } from "@/lib/db/schema";

/** GET /api/business/projects — daftar proyek */
export async function GET() {
  const rows = db.select().from(businessProjects).orderBy(desc(businessProjects.createdAt)).all();
  return NextResponse.json({ data: rows });
}

/** POST /api/business/projects — buat proyek (BIZ-02) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama proyek kosong" }, { status: 400 });
    }
    const row = db
      .insert(businessProjects)
      .values({
        name,
        stage: String(body.stage || "riset"),
        target: String(body.target || ""),
        deadline: String(body.deadline || ""),
        active: body.active !== undefined ? Boolean(body.active) : true,
      })
      .returning()
      .get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/business/projects error:", err);
    return NextResponse.json({ error: "Gagal menyimpan proyek" }, { status: 500 });
  }
}
