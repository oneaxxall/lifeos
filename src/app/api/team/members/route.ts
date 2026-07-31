import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/db/schema";

/** GET /api/team/members — daftar anggota */
export async function GET() {
  const rows = db.select().from(teamMembers).orderBy(asc(teamMembers.name)).all();
  return NextResponse.json({ data: rows });
}

/** POST /api/team/members — catat anggota tim (TE-01) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama anggota kosong" }, { status: 400 });
    }
    const row = db
      .insert(teamMembers)
      .values({
        name,
        role: String(body.role || ""),
        seniority: String(body.seniority || "mid"),
        strengths: String(body.strengths || ""),
      })
      .returning()
      .get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/team/members error:", err);
    return NextResponse.json({ error: "Gagal menyimpan anggota" }, { status: 500 });
  }
}
