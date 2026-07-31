"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowDownCircle, ArrowUpCircle, Pencil, ReceiptText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TransactionEditDialog } from "@/components/finance/transaction-edit-dialog";
import { toast } from "sonner";
import type { FinanceCategory } from "@/lib/db/schema";

export interface TransactionItem {
  id: number;
  amount: number;
  type: "masuk" | "keluar";
  description: string;
  categoryId: number | null;
  categoryName: string | null;
  date: string;
}

function formatRp(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

interface Props {
  transactions: TransactionItem[];
  categories: FinanceCategory[];
  /** Opsi bulan yang tersedia (YYYY-MM) */
  months: string[];
  onDelete: () => void;
}

/** Daftar transaksi + filter dropdown (bulan, kategori, tipe) — FIN-01/03.
 *  Single responsibility: menampilkan & menghapus transaksi. */
export function TransactionList({ transactions, categories, months, onDelete }: Props) {
  const [month, setMonth] = React.useState(months[0] ?? "");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [deleteTarget, setDeleteTarget] = React.useState<TransactionItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<TransactionItem | null>(null);

  const filtered = transactions.filter((t) => {
    if (month && !t.date.startsWith(month)) return false;
    if (categoryFilter !== "all" && t.categoryId !== Number(categoryFilter)) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    return true;
  });

  const remove = async (item: TransactionItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/finance/transactions/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Transaksi dihapus");
      setDeleteTarget(null);
      onDelete();
    } catch {
      toast.error("Gagal menghapus transaksi");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Filter bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ReceiptText className="size-4 text-primary" /> Transaksi
          <Badge variant="secondary" className="text-[10px]">
            {filtered.length}
          </Badge>
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {format(new Date(`${m}-01`), "MMMM yyyy", { locale: id })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Semua tipe</SelectItem>
              <SelectItem value="keluar" className="text-xs">Pengeluaran</SelectItem>
              <SelectItem value="masuk" className="text-xs">Pemasukan</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Semua kategori</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)} className="text-xs capitalize">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Daftar */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Belum ada transaksi dengan filter ini
        </p>
      ) : (
        <ul className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
          {filtered.map((t) => (
            <li
              key={t.id}
              className="group flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 transition-colors hover:bg-muted/40"
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                  t.type === "keluar" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {t.type === "keluar" ? (
                  <ArrowDownCircle className="size-4" />
                ) : (
                  <ArrowUpCircle className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {t.description || (t.categoryName ? t.categoryName : "Tanpa keterangan")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.categoryName ? (
                    <span className="capitalize">{t.categoryName}</span>
                  ) : (
                    "Tanpa kategori"
                  )}{" "}
                  · {format(new Date(t.date), "d MMM yyyy", { locale: id })}
                </p>
              </div>
              <span
                className={`text-sm font-bold tabular-nums ${
                  t.type === "keluar" ? "text-foreground" : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {t.type === "keluar" ? "−" : "+"}
                {formatRp(t.amount)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 text-muted-foreground transition-opacity hover:text-foreground group-hover:opacity-100"
                onClick={() => setEditTarget(t)}
                aria-label={`Edit transaksi ${t.id}`}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
                onClick={() => setDeleteTarget(t)}
                aria-label={`Hapus transaksi ${t.id}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus transaksi"
        description={`Hapus transaksi ${deleteTarget ? formatRp(deleteTarget.amount) : ""}?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />

      {/* Edit transaksi */}
      <TransactionEditDialog
        key={editTarget ? `edit-${editTarget.id}` : "edit-closed"}
        open={editTarget !== null}
        onOpenChange={(o) => !o && setEditTarget(null)}
        transaction={editTarget}
        categories={categories}
        onSaved={onDelete}
      />
    </div>
  );
}
