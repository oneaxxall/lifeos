import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";

/** GET /api/finance/subscriptions — daftar subscription + total bulanan */
export async function GET() {
  const rows = db.select().from(subscriptions).orderBy(asc(subscriptions.name)).all();

  // Normalisasi ke biaya bulanan (tahunan ÷ 12)
  const monthlyTotal = rows
    .filter((s) => s.active)
    .reduce((sum, s) => sum + (s.cycle === "tahunan" ? Math.round(s.amount / 12) : s.amount), 0);

  return NextResponse.json({ data: rows, monthlyTotal });
}

/** POST /api/finance/subscriptions — tambah subscription */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const amount = Math.round(Number(body.amount));
    if (!name || !amount || amount <= 0) {
      return NextResponse.json({ error: "Nama & nominal wajib diisi" }, { status: 400 });
    }
    const row = db
      .insert(subscriptions)
      .values({
        name,
        amount,
        cycle: body.cycle === "tahunan" ? "tahunan" : "bulanan",
        nextBillingDate: String(body.nextBillingDate || ""),
        active: body.active !== false,
      })
      .returning()
      .get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/finance/subscriptions error:", err);
    return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
  }
}

/** PATCH /api/finance/subscriptions — toggle aktif / update */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });

    const row = db
      .update(subscriptions)
      .set({
        ...(body.name !== undefined ? { name: String(body.name) } : {}),
        ...(body.amount !== undefined ? { amount: Math.round(Number(body.amount)) } : {}),
        ...(body.cycle !== undefined ? { cycle: body.cycle } : {}),
        ...(body.nextBillingDate !== undefined ? { nextBillingDate: String(body.nextBillingDate) } : {}),
        ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
      })
      .where(eq(subscriptions.id, id))
      .returning()
      .get();

    if (!row) return NextResponse.json({ error: "Subscription tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ data: row });
  } catch (err) {
    console.error("PATCH /api/finance/subscriptions error:", err);
    return NextResponse.json({ error: "Gagal memperbarui" }, { status: 500 });
  }
}
