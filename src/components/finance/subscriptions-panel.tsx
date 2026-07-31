"use client";

import * as React from "react";
import { CalendarClock, CreditCard, Pencil, Plus, Trash2, Zap } from "lucide-react";
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
import { SubscriptionEditDialog } from "@/components/finance/subscription-edit-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface SubscriptionItem {
  id: number;
  name: string;
  amount: number;
  cycle: "bulanan" | "tahunan";
  nextBillingDate: string;
  active: boolean;
}

function formatRp(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

interface Props {
  subscriptions: SubscriptionItem[];
  monthlyTotal: number;
  onChanged: () => void;
}

/** Panel subscription — daftar langganan + total bulanan + tambah/toggle/hapus (FIN-04). */
export function SubscriptionsPanel({ subscriptions, monthlyTotal, onChanged }: Props) {
  const [showForm, setShowForm] = React.useState(false);
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [cycle, setCycle] = React.useState<"bulanan" | "tahunan">("bulanan");
  const [deleteTarget, setDeleteTarget] = React.useState<SubscriptionItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<SubscriptionItem | null>(null);

  const add = async () => {
    const nominal = Number(amount.replace(/\./g, ""));
    if (!name.trim() || !nominal || nominal <= 0) {
      toast.error("Isi nama & nominal dengan benar");
      return;
    }
    try {
      const res = await fetch("/api/finance/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), amount: nominal, cycle }),
      });
      if (!res.ok) throw new Error();
      toast.success("Subscription ditambahkan");
      setName("");
      setAmount("");
      setShowForm(false);
      onChanged();
    } catch {
      toast.error("Gagal menambah subscription");
    }
  };

  const toggleActive = async (sub: SubscriptionItem) => {
    try {
      const res = await fetch("/api/finance/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sub.id, active: !sub.active }),
      });
      if (!res.ok) throw new Error();
      onChanged();
    } catch {
      toast.error("Gagal mengubah status");
    }
  };

  const remove = async (sub: SubscriptionItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/finance/subscriptions/${sub.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Subscription dihapus");
      setDeleteTarget(null);
      onChanged();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CreditCard className="size-4 text-primary" /> Subscription
          <Badge variant="secondary" className="text-[10px]">
            {subscriptions.filter((s) => s.active).length} aktif
          </Badge>
        </p>
        <span className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          <Zap className="size-3.5" /> {formatRp(monthlyTotal)}/bln
        </span>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-3.5" /> Tambah
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 flex flex-wrap gap-2 rounded-lg bg-muted/40 p-2">
          <Input
            placeholder="Nama (Netflix, Spotify…)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 w-44 text-xs"
            autoFocus
          />
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Nominal"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "");
              setAmount(v ? Number(v).toLocaleString("id-ID") : "");
            }}
            className="h-8 w-28 text-right text-xs tabular-nums"
          />
          <Select value={cycle} onValueChange={(v) => setCycle(v as "bulanan" | "tahunan")}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bulanan" className="text-xs">Bulanan</SelectItem>
              <SelectItem value="tahunan" className="text-xs">Tahunan</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-xs" onClick={() => void add()}>
            Simpan
          </Button>
        </div>
      )}

      {subscriptions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Belum ada subscription — klik &quot;Tambah&quot; untuk mencatat langganan pertama.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {subscriptions.map((s) => (
            <li
              key={s.id}
              className="group flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 transition-colors hover:bg-muted/40"
            >
              <button
                onClick={() => void toggleActive(s)}
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  s.active
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40"
                )}
                aria-label={s.active ? `Nonaktifkan ${s.name}` : `Aktifkan ${s.name}`}
                title={s.active ? "Klik untuk nonaktifkan" : "Klik untuk aktifkan"}
              >
                {s.active && <span className="size-1.5 rounded-full bg-background" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-medium", !s.active && "text-muted-foreground line-through")}>
                  {s.name}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarClock className="size-3" />
                  {s.nextBillingDate ? s.nextBillingDate : "—"} · {s.cycle}
                </p>
              </div>
              <span className={cn("text-sm font-bold tabular-nums", !s.active && "text-muted-foreground")}>
                {formatRp(s.amount)}/{s.cycle === "bulanan" ? "bln" : "thn"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 text-muted-foreground transition-opacity hover:text-foreground group-hover:opacity-100"
                onClick={() => setEditTarget(s)}
                aria-label={`Edit ${s.name}`}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
                onClick={() => setDeleteTarget(s)}
                aria-label={`Hapus ${s.name}`}
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
        title="Hapus subscription"
        description={`Hapus "${deleteTarget?.name}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />

      {/* Edit subscription */}
      <SubscriptionEditDialog
        key={editTarget ? `edit-${editTarget.id}` : "edit-closed"}
        open={editTarget !== null}
        onOpenChange={(o) => !o && setEditTarget(null)}
        subscription={editTarget}
        onSaved={onChanged}
      />
    </div>
  );
}
