"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { FinanceCategory } from "@/lib/db/schema";
import type { TransactionItem } from "@/components/finance/transaction-list";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionItem | null;
  categories: FinanceCategory[];
  onSaved: () => void;
}

/** Dialog edit transaksi — ubah nominal, tipe, kategori, tanggal, deskripsi. */
export function TransactionEditDialog({ open, onOpenChange, transaction, categories, onSaved }: Props) {
  const [amount, setAmount] = React.useState(transaction ? String(transaction.amount) : "");
  const [tipe, setTipe] = React.useState<"masuk" | "keluar">(transaction?.type ?? "keluar");
  const [description, setDescription] = React.useState(transaction?.description ?? "");
  const [categoryId, setCategoryId] = React.useState(
    transaction?.categoryId ? String(transaction.categoryId) : ""
  );
  const [date, setDate] = React.useState(transaction?.date ?? "");
  const [saving, setSaving] = React.useState(false);

  const filteredCategories = categories.filter((c) => c.type === tipe);

  const save = async () => {
    const nominal = Number(amount.replace(/\./g, ""));
    if (!transaction || !nominal || nominal <= 0) {
      toast.error("Nominal tidak valid");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/finance/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: nominal,
          type: tipe,
          description,
          categoryId: categoryId ? Number(categoryId) : null,
          date,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Transaksi diperbarui ✨");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Gagal memperbarui transaksi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Pencil className="size-4 text-primary" /> Edit transaksi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Tipe</p>
              <Select value={tipe} onValueChange={(v) => { setTipe(v as "masuk" | "keluar"); setCategoryId(""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keluar">Pengeluaran</SelectItem>
                  <SelectItem value="masuk">Pemasukan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Nominal (Rp)</p>
              <Input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, "");
                  setAmount(v ? Number(v).toLocaleString("id-ID") : "");
                }}
                className="text-right font-semibold tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Kategori</p>
              <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa kategori</SelectItem>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="capitalize">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Tanggal</p>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Deskripsi</p>
            <Input
              placeholder="Deskripsi (opsional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
