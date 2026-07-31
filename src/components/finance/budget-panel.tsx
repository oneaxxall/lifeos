"use client";

import * as React from "react";
import { PiggyBank, Plus, Trash2, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FinanceCategory } from "@/lib/db/schema";

export interface BudgetItem {
  id: number;
  categoryId: number;
  categoryName: string;
  limitAmount: number;
  spent: number;
  remaining: number;
  percent: number;
}

function formatRp(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

interface Props {
  budgets: BudgetItem[];
  categories: FinanceCategory[];
  onChanged: () => void;
}

/** Panel budget per kategori — progress bar + indikator sisa/over (FIN-05). */
export function BudgetPanel({ budgets, categories, onChanged }: Props) {
  const [showForm, setShowForm] = React.useState(false);
  const [categoryId, setCategoryId] = React.useState("");
  const [limitAmount, setLimitAmount] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<BudgetItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Hanya kategori pengeluaran yang belum punya budget
  const availableCats = categories.filter(
    (c) => c.type === "keluar" && !budgets.some((b) => b.categoryId === c.id)
  );

  const add = async () => {
    const nominal = Number(limitAmount.replace(/\./g, ""));
    if (!categoryId || !nominal || nominal <= 0) {
      toast.error("Pilih kategori & isi batas budget");
      return;
    }
    try {
      const res = await fetch("/api/finance/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: Number(categoryId), limitAmount: nominal }),
      });
      if (!res.ok) throw new Error();
      toast.success("Budget disimpan");
      setCategoryId("");
      setLimitAmount("");
      setShowForm(false);
      onChanged();
    } catch {
      toast.error("Gagal menyimpan budget");
    }
  };

  const remove = async (b: BudgetItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/finance/budgets/${b.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Budget dihapus");
      setDeleteTarget(null);
      onChanged();
    } catch {
      toast.error("Gagal menghapus budget");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <PiggyBank className="size-4 text-primary" /> Budget bulanan
          <Badge variant="secondary" className="text-[10px]">
            {budgets.length}
          </Badge>
        </p>
        <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-3.5" /> Atur budget
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 flex flex-wrap gap-2 rounded-lg bg-muted/40 p-2">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {availableCats.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">Semua kategori sudah punya budget</p>
              ) : (
                availableCats.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-xs capitalize">
                    {c.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Batas (Rp)"
            value={limitAmount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "");
              setLimitAmount(v ? Number(v).toLocaleString("id-ID") : "");
            }}
            className="h-8 w-32 text-right text-xs tabular-nums"
          />
          <Button size="sm" className="h-8 text-xs" onClick={() => void add()}>
            Simpan
          </Button>
        </div>
      )}

      {budgets.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Belum ada budget — atur batas per kategori agar AI bisa deteksi pemborosan.
        </p>
      ) : (
        <ul className="space-y-3">
          {budgets.map((b) => {
            const isOver = b.percent >= 100;
            const isWarning = b.percent >= 80 && !isOver;
            return (
              <li key={b.id} className="group">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 capitalize font-medium">
                    {b.categoryName}
                    {isOver && (
                      <span className="rounded bg-destructive/10 px-1 py-px text-[9px] font-semibold text-destructive">
                        OVER
                      </span>
                    )}
                    {isWarning && (
                      <span className="rounded bg-amber-500/10 px-1 py-px text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                        HAMPIR
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 tabular-nums">
                    <span className="text-muted-foreground">
                      {formatRp(b.spent)} / {formatRp(b.limitAmount)}
                    </span>
                    <span
                      className={cn(
                        "w-14 text-right font-semibold",
                        isOver ? "text-destructive" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {isOver ? `+${formatRp(-b.remaining)}` : `${formatRp(b.remaining)}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
                      onClick={() => setDeleteTarget(b)}
                      aria-label={`Hapus budget ${b.categoryName}`}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isOver
                        ? "bg-destructive"
                        : isWarning
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(b.percent, 100)}%` }}
                  />
                </div>
                {isOver && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-destructive">
                    <TrendingDown className="size-3" /> Melebihi budget {formatRp(-b.remaining)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus budget"
        description={`Hapus budget "${deleteTarget?.categoryName}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
