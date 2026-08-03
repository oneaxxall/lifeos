import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { goldHoldings } from "@/lib/db/schema";

export async function GET() {
  const rows = db.select().from(goldHoldings).orderBy(desc(goldHoldings.id)).all();
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const row = db
      .insert(goldHoldings)
      .values({
        name: String(b.name || "Emas").slice(0, 100),
        grams: Number(b.grams) || 0,
        buyPricePerGram: Number(b.buyPricePerGram) || 0,
        currentPricePerGram: Number(b.currentPricePerGram) || 0,
        status: ["simpan", "dijual"].includes(b.status) ? b.status : "simpan",
        notes: String(b.notes || "").slice(0, 500),
      })
      .returning()
      .get();
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan emas" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const b = await req.json();
    const id = Number(b.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
    const sets: Record<string, unknown> = {};
    if (typeof b.name === "string" && b.name.trim()) sets.name = b.name.trim().slice(0, 100);
    if (typeof b.grams === "number") sets.grams = b.grams;
    if (typeof b.buyPricePerGram === "number") sets.buyPricePerGram = b.buyPricePerGram;
    if (typeof b.currentPricePerGram === "number") sets.currentPricePerGram = b.currentPricePerGram;
    if (typeof b.status === "string" && ["simpan", "dijual"].includes(b.status)) sets.status = b.status;
    if (typeof b.notes === "string") sets.notes = b.notes.slice(0, 500);
    if (Object.keys(sets).length === 0) return NextResponse.json({ error: "Tidak ada field valid" }, { status: 400 });
    await db.update(goldHoldings).set(sets).where(eq(goldHoldings.id, id)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui emas" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!Number.isFinite(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
    await db.delete(goldHoldings).where(eq(goldHoldings.id, id)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus emas" }, { status: 500 });
  }
}
