import { asc, desc, eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  financeCategories,
  financeTransactions,
  type FinanceTransaction,
} from "@/lib/db/schema";

export interface TransactionWithCategory extends FinanceTransaction {
  categoryName: string | null;
  categoryIcon: string | null;
}

/** Kategori tersedia — untuk dropdown & autocomplete */
export function listCategories(): (typeof financeCategories.$inferSelect)[] {
  return db
    .select()
    .from(financeCategories)
    .orderBy(asc(financeCategories.name))
    .all();
}

/** Transaksi dengan nama kategori (join) */
export function listTransactions(): TransactionWithCategory[] {
  const rows = db
    .select({
      tx: financeTransactions,
      categoryName: financeCategories.name,
      categoryIcon: financeCategories.icon,
    })
    .from(financeTransactions)
    .leftJoin(
      financeCategories,
      eq(financeTransactions.categoryId, financeCategories.id)
    )
    .orderBy(desc(financeTransactions.date), desc(financeTransactions.id))
    .all();

  return rows.map(({ tx, categoryName, categoryIcon }) => ({
    ...tx,
    categoryName: categoryName ?? null,
    categoryIcon: categoryIcon ?? null,
  }));
}

/** Ringkasan bulan tertentu: total masuk, keluar, per kategori */
export function monthlySummary(month: string /* YYYY-MM */) {
  const rows = db
    .select({
      tx: financeTransactions,
      categoryName: financeCategories.name,
    })
    .from(financeTransactions)
    .leftJoin(
      financeCategories,
      eq(financeTransactions.categoryId, financeCategories.id)
    )
    .where(like(financeTransactions.date, `${month}%`))
    .all();

  let masuk = 0;
  let keluar = 0;
  const byCategory = new Map<string, number>();

  for (const { tx, categoryName } of rows) {
    if (tx.type === "masuk") masuk += tx.amount;
    else {
      keluar += tx.amount;
      const key = categoryName ?? "Tanpa kategori";
      byCategory.set(key, (byCategory.get(key) ?? 0) + tx.amount);
    }
  }

  const kategori = Array.from(byCategory.entries())
    .map(([nama, total]) => ({ nama, total }))
    .sort((a, b) => b.total - a.total);

  return { bulan: month, masuk, keluar, saldo: masuk - keluar, kategori };
}
