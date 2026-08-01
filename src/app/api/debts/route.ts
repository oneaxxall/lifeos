import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { debts } from "@/lib/db/schema";

const NUM = (v: unknown, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : def;
};

const TYPES = ["hutang", "piutang"] as const;
const MODES = ["sekali", "cicilan"] as const;

/** Status otomatis dari jumlah sudah dibayar vs total. */
function computeStatus(amount: number, paid: number): "belum" | "sebagian" | "lunas" {
  if (amount <= 0) return "lunas";
  if (paid >= amount) return "lunas";
  if (paid > 0) return "sebagian";
  return "belum";
}

/** GET /api/debts — daftar + ringkasan hutang/piutang. */
export async function GET() {
  const rows = db.select().from(debts).orderBy(desc(debts.date)).all();

  const data = rows.map((r) => ({
    id: r.id,
    type: r.type,
    party: r.party,
    amount: r.amount,
    paymentMode: r.paymentMode,
    installmentCount: r.installmentCount,
    installmentsPaid: r.installmentsPaid,
    paidAmount: r.paidAmount,
    date: r.date,
    dueDate: r.dueDate ?? "",
    status: r.status,
    notes: r.notes ?? "",
    /** Sisa yang belum dibayar */
    remaining: Math.max(0, r.amount - r.paidAmount),
    /** Progress % */
    progressPct: r.amount > 0 ? Math.min(100, Math.round((r.paidAmount / r.amount) * 100)) : 100,
  }));

  // Ringkasan: total hutang & piutang (aktif = belum lunas)
  const summary = {
    totalHutang: data.filter((d) => d.type === "hutang").reduce((a, d) => a + d.amount, 0),
    totalPiutang: data.filter((d) => d.type === "piutang").reduce((a, d) => a + d.amount, 0),
    aktifHutang: data
      .filter((d) => d.type === "hutang" && d.status !== "lunas")
      .reduce((a, d) => a + d.remaining, 0),
    aktifPiutang: data
      .filter((d) => d.type === "piutang" && d.status !== "lunas")
      .reduce((a, d) => a + d.remaining, 0),
    lunasCount: data.filter((d) => d.status === "lunas").length,
  };
  const selisih = summary.aktifPiutang - summary.aktifHutang; // >0 = kita lebih banyak menerima

  return NextResponse.json({ data, summary: { ...summary, selisih } });
}

/** POST /api/debts — tambah hutang/piutang. */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const party = String(b.party || "").trim();
    if (!party) {
      return NextResponse.json({ error: "Nama pihak wajib diisi" }, { status: 400 });
    }

    const type = (TYPES as readonly string[]).includes(String(b.type))
      ? (String(b.type) as "hutang" | "piutang")
      : "hutang";
    const paymentMode = (MODES as readonly string[]).includes(String(b.paymentMode))
      ? (String(b.paymentMode) as "sekali" | "cicilan")
      : "sekali";

    const amount = NUM(b.amount);
    const paidAmount = NUM(b.paidAmount);
    const installmentCount = paymentMode === "cicilan" ? Math.max(1, NUM(b.installmentCount, 1)) : 1;
    const installmentsPaid = paymentMode === "cicilan" ? Math.max(0, NUM(b.installmentsPaid)) : 0;

    // Cicilan: nominal per cicilan = amount / count
    const installmentAmount = installmentCount > 0 ? Math.round(amount / installmentCount) : 0;

    const row = db
      .insert(debts)
      .values({
        type,
        party,
        amount,
        paymentMode,
        installmentCount,
        installmentsPaid,
        paidAmount,
        date: String(b.date || new Date().toISOString().slice(0, 10)),
        dueDate: String(b.dueDate || ""),
        status: computeStatus(amount, paidAmount),
        notes: String(b.notes || "").slice(0, 300),
      })
      .returning()
      .get();

    return NextResponse.json({ data: row, installmentAmount }, { status: 201 });
  } catch (err) {
    console.error("POST /api/debts error:", err);
    return NextResponse.json({ error: "Gagal menambah data" }, { status: 500 });
  }
}

/** PATCH /api/debts — perbarui (termasuk tandai bayar/cicilan). */
export async function PATCH(req: NextRequest) {
  try {
    const b = await req.json();
    const id = Number(b.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const existing = db.select().from(debts).where(eq(debts.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }

    const amount = b.amount !== undefined ? NUM(b.amount) : existing.amount;
    const paidAmount = b.paidAmount !== undefined ? NUM(b.paidAmount) : existing.paidAmount;
    const paymentMode = b.paymentMode !== undefined
      ? ((MODES as readonly string[]).includes(String(b.paymentMode))
          ? (String(b.paymentMode) as "sekali" | "cicilan")
          : existing.paymentMode)
      : existing.paymentMode;
    const installmentCount = b.installmentCount !== undefined
      ? Math.max(1, NUM(b.installmentCount, 1))
      : existing.installmentCount;
    const installmentsPaid = b.installmentsPaid !== undefined
      ? Math.max(0, NUM(b.installmentsPaid))
      : existing.installmentsPaid;

    const row = db
      .update(debts)
      .set({
        type:
          b.type !== undefined
            ? ((TYPES as readonly string[]).includes(String(b.type))
                ? (String(b.type) as "hutang" | "piutang")
                : existing.type)
            : existing.type,
        party: b.party !== undefined ? String(b.party).trim() || existing.party : existing.party,
        amount,
        paymentMode,
        installmentCount,
        installmentsPaid,
        paidAmount,
        date: b.date !== undefined ? String(b.date) : existing.date,
        dueDate: b.dueDate !== undefined ? String(b.dueDate) : existing.dueDate,
        status: computeStatus(amount, paidAmount),
        notes: b.notes !== undefined ? String(b.notes).slice(0, 300) : existing.notes,
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(debts.id, id))
      .returning()
      .get();

    return NextResponse.json({ data: row });
  } catch (err) {
    console.error("PATCH /api/debts error:", err);
    return NextResponse.json({ error: "Gagal memperbarui" }, { status: 500 });
  }
}
