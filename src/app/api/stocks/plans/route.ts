import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { stockPlans } from "@/lib/db/schema";

/** GET /api/stocks/plans — daftar rencana tersimpan (avg down / right issue). */
export async function GET() {
  const rows = db
    .select()
    .from(stockPlans)
    .orderBy(desc(stockPlans.updatedAt))
    .all();

  const data = rows.map((r) => ({
    id: r.id,
    code: r.code,
    type: r.type,
    input: safeParse(r.inputJson),
    result: safeParse(r.resultJson),
    notes: r.notes ?? "",
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
  return NextResponse.json({ data });
}

/** POST /api/stocks/plans — simpan rencana baru (kode saham + input + hasil). */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const code = String(b.code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9.\-]/g, "");
    const type = ["avgdown", "rightissue", "lotfee"].includes(String(b.type))
      ? (String(b.type) as "avgdown" | "rightissue" | "lotfee")
      : "avgdown";
    const input = b.input ?? {};
    const result = b.result ?? {};

    if (!code) {
      return NextResponse.json({ error: "Kode saham wajib diisi (mis. BBRI)" }, { status: 400 });
    }

    const row = db
      .insert(stockPlans)
      .values({
        code,
        type,
        inputJson: JSON.stringify(input),
        resultJson: JSON.stringify(result),
        notes: String(b.notes || "").slice(0, 200),
      })
      .returning()
      .get();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/stocks/plans error:", err);
    return NextResponse.json({ error: "Gagal menyimpan rencana" }, { status: 500 });
  }
}

function safeParse(s: string | null): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
