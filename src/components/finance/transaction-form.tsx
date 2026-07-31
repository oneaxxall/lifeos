"use client";

import * as React from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  ChevronsUpDown,
  Plus,
  ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { toast } from "sonner";
import type { FinanceCategory } from "@/lib/db/schema";

interface Props {
  categories: FinanceCategory[];
  onSaved: () => void;
  onCategoryCreated: (cat: FinanceCategory) => void;
}

type Tipe = "keluar" | "masuk";

/** Form input transaksi cepat (< 10 detik) — nominal, tipe, kategori, tanggal.
 *  Single responsibility: hanya mencatat transaksi baru. */
export function TransactionForm({ categories, onSaved, onCategoryCreated }: Props) {
  const [amount, setAmount] = React.useState("");
  const [tipe, setTipe] = React.useState<Tipe>("keluar");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<number | null>(null);
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [catOpen, setCatOpen] = React.useState(false);
  const [newCat, setNewCat] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const filteredCategories = categories.filter((c) => c.type === tipe);

  const createCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/finance/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: tipe }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      toast.success(`Kategori "${name}" dibuat`);
      setNewCat("");
      setCatOpen(false);
      setCategoryId(json.data.id);
      onCategoryCreated(json.data);
    } catch {
      toast.error("Gagal membuat kategori (mungkin sudah ada)");
    }
  };

  const save = async () => {
    const nominal = Number(amount.replace(/\./g, ""));
    if (!nominal || nominal <= 0) {
      toast.error("Masukkan nominal yang valid");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: nominal,
          type: tipe,
          description,
          categoryId,
          date,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(tipe === "keluar" ? "Pengeluaran dicatat 💸" : "Pemasukan dicatat 💰");
      setAmount("");
      setDescription("");
      onSaved();
    } catch {
      toast.error("Gagal menyimpan transaksi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <ReceiptText className="size-4 text-primary" /> Catat transaksi
      </p>

      <div className="grid gap-3 sm:grid-cols-12">
        {/* Tipe */}
        <div className="sm:col-span-3">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => {
                setTipe("keluar");
                setCategoryId(null);
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                tipe === "keluar"
                  ? "bg-background text-destructive shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowDownCircle className="size-3.5" /> Keluar
            </button>
            <button
              type="button"
              onClick={() => {
                setTipe("masuk");
                setCategoryId(null);
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                tipe === "masuk"
                  ? "bg-background text-emerald-600 shadow-sm dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowUpCircle className="size-3.5" /> Masuk
            </button>
          </div>
        </div>

        {/* Nominal */}
        <div className="sm:col-span-3">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Nominal (Rp)"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "");
              setAmount(v ? Number(v).toLocaleString("id-ID") : "");
            }}
            className="text-right font-semibold tabular-nums"
            autoFocus
          />
        </div>

        {/* Kategori — dropdown with create new */}
        <div className="sm:col-span-3">
          <Popover open={catOpen} onOpenChange={setCatOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={catOpen}
                className="w-full justify-between text-sm font-normal"
              >
                <span className="truncate">
                  {categoryId
                    ? filteredCategories.find((c) => c.id === categoryId)?.name
                    : "Pilih kategori…"}
                </span>
                <ChevronsUpDown className="size-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cari / buat kategori…" value={newCat} onValueChange={setNewCat} />
                <CommandEmpty>
                  <button
                    onClick={() => void createCategory()}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-muted"
                  >
                    <Plus className="size-3.5" /> Buat &quot;{newCat}&quot;
                  </button>
                </CommandEmpty>
                <CommandGroup heading={tipe === "keluar" ? "Kategori pengeluaran" : "Kategori pemasukan"}>
                  {filteredCategories.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.name}
                      onSelect={() => {
                        setCategoryId(c.id);
                        setCatOpen(false);
                      }}
                      className="capitalize"
                    >
                      <Check
                        className={cn(
                          "mr-2 size-3.5",
                          categoryId === c.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Tanggal */}
        <div className="sm:col-span-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* Simpan */}
        <div className="sm:col-span-1">
          <Button onClick={() => void save()} disabled={saving} className="w-full">
            {saving ? "…" : "Simpan"}
          </Button>
        </div>
      </div>

      <div className="mt-2">
        <Input
          placeholder="Deskripsi (opsional) — mis. makan siang tim"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void save()}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}
