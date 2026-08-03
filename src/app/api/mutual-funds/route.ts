import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mutualFunds } from "@/lib/db/schema";

export async function GET() {
  const rows = db.select().from(mutualFunds).orderBy(desc(mutualFunds.id)).all();
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const row = db
      .insert(mutualFunds)
      .values({
        name: String(b.name || "Reksa Dana").slice(0, 100),
        type: ["pasar_uang", "pendapatan_tetap", "saham", "campuran", "indeks"].includes(b.type) ? b.type : "pasar_uang",
        units: Number(b.units) || 0,
        navPrice: Number(b.navPrice) || 0,
        investedAmount: Number(b.investedAmount) || 0,
        status: ["aktif", "dijual"].includes(b.status) ? b.status : "aktif",
        notes: String(b.notes || "").slice(0, 500),
      })
      .returning()
      .get();
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan reksa dana" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const b = await req.json();
    const id = Number(b.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
    const sets: Record<string, unknown> = {};
    if (typeof b.name === "string" && b.name.trim()) sets.name = b.name.trim().slice(0, 100);
    if (typeof b.type === "string" && ["pasar_uang", "pendapatan_tetap", "saham", "campuran", "indeks"].includes(b.type)) sets.type = b.type;
    if (typeof b.units === "number") sets.units = b.units;
    if (typeof b.navPrice === "number") sets.navPrice = b.navPrice;
    if (typeof b.investedAmount === "number") sets.investedAmount = b.investedAmount;
    if (typeof b.status === "string" && ["aktif", "dijual"].includes(b.status)) sets.status = b.status;
    if (typeof b.notes === "string") sets.notes = b.notes.slice(0, 500);
    if (Object.keys(sets).length === 0) return NextResponse.json({ error: "Tidak ada field valid" }, { status: 400 });
    await db.update(mutualFunds).set(sets).where(eq(mutualFunds.id, id)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui reksa dana" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!Number.isFinite(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
    await db.delete(mutualFunds).where(eq(mutualFunds.id, id)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus reksa dana" }, { status: 500 });
  }
}
