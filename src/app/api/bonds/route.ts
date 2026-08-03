import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bonds } from "@/lib/db/schema";

export async function GET() {
  const rows = db.select().from(bonds).orderBy(desc(bonds.id)).all();
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const row = db
      .insert(bonds)
      .values({
        name: String(b.name || "Obligasi").slice(0, 100),
        code: String(b.code || "").slice(0, 20),
        type: ["sbn", "fr", "sukuk", "korporasi", "lainnya"].includes(b.type) ? b.type : "fr",
        nominal: Number(b.nominal) || 0,
        buyPrice: Number(b.buyPrice) || 0,
        couponRate: Number(b.couponRate) || 0,
        maturityDate: String(b.maturityDate || ""),
        status: ["aktif", "jatuh_tempo", "dijual"].includes(b.status) ? b.status : "aktif",
        notes: String(b.notes || "").slice(0, 500),
      })
      .returning()
      .get();
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan obligasi" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const b = await req.json();
    const id = Number(b.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
    const sets: Record<string, unknown> = {};
    if (typeof b.name === "string" && b.name.trim()) sets.name = b.name.trim().slice(0, 100);
    if (typeof b.code === "string") sets.code = b.code.slice(0, 20);
    if (typeof b.type === "string" && ["sbn", "fr", "sukuk", "korporasi", "lainnya"].includes(b.type)) sets.type = b.type;
    if (typeof b.nominal === "number") sets.nominal = b.nominal;
    if (typeof b.buyPrice === "number") sets.buyPrice = b.buyPrice;
    if (typeof b.couponRate === "number") sets.couponRate = b.couponRate;
    if (typeof b.maturityDate === "string") sets.maturityDate = b.maturityDate;
    if (typeof b.status === "string" && ["aktif", "jatuh_tempo", "dijual"].includes(b.status)) sets.status = b.status;
    if (typeof b.notes === "string") sets.notes = b.notes.slice(0, 500);
    if (Object.keys(sets).length === 0) return NextResponse.json({ error: "Tidak ada field valid" }, { status: 400 });
    await db.update(bonds).set(sets).where(eq(bonds.id, id)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui obligasi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!Number.isFinite(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
    await db.delete(bonds).where(eq(bonds.id, id)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus obligasi" }, { status: 500 });
  }
}
