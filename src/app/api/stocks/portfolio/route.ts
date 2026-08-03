import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { stockPortfolio } from "@/lib/db/schema";

const NUM = (v: unknown, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : def;
};

/** GET /api/stocks/portfolio — daftar posisi + ringkasan (modal, nilai, P/L). */
export async function GET() {
  const rows = db
    .select()
    .from(stockPortfolio)
    .orderBy(asc(stockPortfolio.code))
    .all();

  const positions = rows.map((r) => ({
    id: r.id,
    code: r.code,
    lot: r.lot,
    availableLot: r.availableLot,
    shares: r.lot * 100,
    buyPrice: r.buyPrice,
    marketPrice: r.marketPrice ?? 0,
    buyDate: r.buyDate ?? "",
    notes: r.notes ?? "",
  }));

  // Ringkasan
  const summary = positions.reduce(
    (acc, p) => {
      const cost = p.shares * p.buyPrice;
      const value = p.marketPrice > 0 ? p.shares * p.marketPrice : cost;
      acc.totalCost += cost;
      acc.totalValue += value;
      acc.unrealized += value - cost;
      return acc;
    },
    { totalCost: 0, totalValue: 0, unrealized: 0 }
  );
  const unrealizedPct = summary.totalCost > 0 ? (summary.unrealized / summary.totalCost) * 100 : 0;

  return NextResponse.json({ data: positions, summary: { ...summary, unrealizedPct } });
}

/** POST /api/stocks/portfolio — tambah posisi baru. */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const code = String(b.code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9.\-]/g, "");
    if (!code) {
      return NextResponse.json({ error: "Kode saham wajib diisi (mis. BBRI)" }, { status: 400 });
    }

    const row = db
      .insert(stockPortfolio)
      .values({
        code,
        lot: NUM(b.lot),
        availableLot: NUM(b.availableLot),
        buyPrice: NUM(b.buyPrice),
        marketPrice: NUM(b.marketPrice),
        buyDate: String(b.buyDate || ""),
        notes: String(b.notes || "").slice(0, 200),
      })
      .returning()
      .get();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/stocks/portfolio error:", err);
    return NextResponse.json({ error: "Gagal menambah posisi" }, { status: 500 });
  }
}

/** PATCH /api/stocks/portfolio — perbarui posisi (partial: hanya field yang dikirim). */
export async function PATCH(req: NextRequest) {
  try {
    const b = await req.json();
    const id = Number(b.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const sets: Record<string, unknown> = { updatedAt: sql`(datetime('now'))` };
    if (typeof b.lot === "number") sets.lot = NUM(b.lot);
    if (typeof b.availableLot === "number") sets.availableLot = NUM(b.availableLot);
    if (typeof b.buyPrice === "number") sets.buyPrice = NUM(b.buyPrice);
    if (typeof b.marketPrice === "number") sets.marketPrice = NUM(b.marketPrice);
    if (typeof b.buyDate === "string") sets.buyDate = b.buyDate;
    if (typeof b.notes === "string") sets.notes = b.notes.slice(0, 200);

    const row = db
      .update(stockPortfolio)
      .set(sets)
      .where(eq(stockPortfolio.id, id))
      .returning()
      .get();

    if (!row) {
      return NextResponse.json({ error: "Posisi tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ data: row });
  } catch (err) {
    console.error("PATCH /api/stocks/portfolio error:", err);
    return NextResponse.json({ error: "Gagal memperbarui posisi" }, { status: 500 });
  }
}
