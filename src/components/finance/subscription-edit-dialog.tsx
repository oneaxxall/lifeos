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
import type { SubscriptionItem } from "@/components/finance/subscriptions-panel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: SubscriptionItem | null;
  onSaved: () => void;
}

/** Dialog edit subscription — ubah nama, biaya, siklus, tanggal tagihan. */
export function SubscriptionEditDialog({ open, onOpenChange, subscription, onSaved }: Props) {
  const [name, setName] = React.useState(subscription?.name ?? "");
  const [amount, setAmount] = React.useState(subscription ? String(subscription.amount) : "");
  const [cycle, setCycle] = React.useState<"bulanan" | "tahunan">(subscription?.cycle ?? "bulanan");
  const [nextBillingDate, setNextBillingDate] = React.useState(subscription?.nextBillingDate ?? "");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    const nominal = Number(amount.replace(/\./g, ""));
    if (!subscription || !name.trim() || !nominal || nominal <= 0) {
      toast.error("Nama & nominal harus valid");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/finance/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: subscription.id,
          name: name.trim(),
          amount: nominal,
          cycle,
          nextBillingDate,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Subscription diperbarui ✨");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Gagal memperbarui subscription");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Pencil className="size-4 text-primary" /> Edit subscription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Nama</p>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Siklus</p>
              <Select value={cycle} onValueChange={(v) => setCycle(v as "bulanan" | "tahunan")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bulanan">Bulanan</SelectItem>
                  <SelectItem value="tahunan">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Tagihan berikutnya</p>
            <Input type="date" value={nextBillingDate} onChange={(e) => setNextBillingDate(e.target.value)} />
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
