import { NextResponse } from "next/server";
import { and, eq, like, lte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { todos, debts, subscriptions, budgets, financeTransactions } from "@/lib/db/schema";

const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export interface AppNotification {
  key: string;
  type: "todo" | "debt" | "subscription" | "budget";
  title: string;
  message: string;
  href: string;
  date: string; // YYYY-MM-DD (untuk label relatif)
}

/** GET /api/notifications — pengingat pintar dari data LifeOS. */
export async function GET() {
  const now = new Date();
  const today = ymd(now);
  const plus3 = ymd(new Date(now.getTime() + 3 * 86400000));
  const minus1 = ymd(new Date(now.getTime() - 86400000));
  const month = today.slice(0, 7);
  const list: AppNotification[] = [];

  // 1. Todos jatuh tempo hari ini / overdue / 3 hari ke depan
  const todoRows = db
    .select()
    .from(todos)
    .where(and(ne(todos.status, "done"), ne(todos.dueDate, ""), lte(todos.dueDate, plus3)))
    .all();
  for (const t of todoRows.slice(0, 5)) {
    const due = t.dueDate ?? "";
    list.push({
      key: `todo:${t.id}`,
      type: "todo",
      title: due === today ? "Jatuh tempo hari ini" : due < today ? "Todo terlambat" : "Todo akan jatuh tempo",
      message: `"${t.title}"${due ? ` — ${due}` : ""}`,
      href: "/todo",
      date: due,
    });
  }

  // 2. Cicilan jatuh tempo (3 hari ke depan + overdue)
  const debtRows = db
    .select()
    .from(debts)
    .where(and(eq(debts.type, "hutang"), ne(debts.status, "lunas"), ne(debts.dueDate, ""), lte(debts.dueDate, plus3)))
    .all();
  for (const d of debtRows.slice(0, 5)) {
    list.push({
      key: `debt:${d.id}`,
      type: "debt",
      title: (d.dueDate ?? "") < today ? "Cicilan terlambat" : "Cicilan akan jatuh tempo",
      message: `${d.party} — sisa ${(d.amount - d.paidAmount).toLocaleString("id-ID")}${d.dueDate ? ` (${d.dueDate})` : ""}`,
      href: "/financial-planning",
      date: d.dueDate ?? "",
    });
  }

  // 3. Langganan akan ditagih (3 hari ke depan)
  const subRows = db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.active, true), ne(subscriptions.nextBillingDate, ""), lte(subscriptions.nextBillingDate, plus3), sql`${subscriptions.nextBillingDate} >= ${minus1}`))
    .all();
  for (const s of subRows.slice(0, 5)) {
    list.push({
      key: `sub:${s.id}`,
      type: "subscription",
      title: "Tagihan langganan",
      message: `"${s.name}" ${s.amount.toLocaleString("id-ID")}${s.nextBillingDate ? ` — tagihan ${s.nextBillingDate}` : ""}`,
      href: "/finance",
      date: s.nextBillingDate ?? "",
    });
  }

  // 4. Budget hampir penuh / melampaui (bulan berjalan)
  const spentRows = db
    .select({ categoryId: financeTransactions.categoryId, total: sql<number>`SUM(${financeTransactions.amount})` })
    .from(financeTransactions)
    .where(and(eq(financeTransactions.type, "keluar"), like(financeTransactions.date, `${month}%`)))
    .groupBy(financeTransactions.categoryId)
    .all();
  const spentMap = new Map<number, number>();
  for (const r of spentRows) {
    if (r.categoryId !== null) spentMap.set(r.categoryId, Number(r.total) || 0);
  }
  const budgetRows = db.select().from(budgets).all();
  for (const b of budgetRows.slice(0, 5)) {
    const used = spentMap.get(b.categoryId) ?? 0;
    if (b.limitAmount > 0 && used / b.limitAmount >= 0.8) {
      const pct = Math.round((used / b.limitAmount) * 100);
      list.push({
        key: `budget:${b.categoryId}`,
        type: "budget",
        title: pct >= 100 ? "Budget melampaui!" : `Budget ${pct}% terpakai`,
        message: `Kategori #${b.categoryId} — ${used.toLocaleString("id-ID")} dari limit ${b.limitAmount.toLocaleString("id-ID")}`,
        href: "/finance",
        date: today,
      });
    }
  }

  // Urut: yang paling dekat jatuh temponya di depan
  list.sort((a, b) => a.date.localeCompare(b.date));
  return NextResponse.json({ data: list.slice(0, 15) });
}
