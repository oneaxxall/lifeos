"use client";

import * as React from "react";
import { Loader2, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CONTACT_PRIORITIES } from "@/lib/db/schema";

const PRIORITY_LABEL: Record<string, string> = {
  penting: "Penting",
  sedang: "Sedang",
  ringan: "Ringan",
};

interface Props {
  onSaved: () => void;
}

/** Form tambah kontak — dipisah di atas list (toggle, pola Family). */
export function ContactForm({ onSaved }: Props) {
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [context, setContext] = React.useState("");
  const [interests, setInterests] = React.useState("");
  const [priority, setPriority] = React.useState("sedang");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast.error("Nama kontak kosong");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/networking/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, role, company, context, interests, priority, lastContact: new Date().toISOString().slice(0, 10) }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Kontak "${n}" tersimpan 🤝`);
      setName(""); setRole(""); setCompany(""); setContext(""); setInterests("");
      setPriority("sedang");
      onSaved();
    } catch {
      toast.error("Gagal menyimpan kontak");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            placeholder="Nama… (mis. Budi Santoso)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void save()}
            className="h-9 text-sm"
          />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="text-sm">
                  {PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input placeholder="Peran (mis. CTO)" value={role} onChange={(e) => setRole(e.target.value)} className="h-9 text-sm" />
          <Input placeholder="Perusahaan" value={company} onChange={(e) => setCompany(e.target.value)} className="h-9 text-sm" />
        </div>
        <Input placeholder="Konteks kenal (mis. Conference 2025)" value={context} onChange={(e) => setContext(e.target.value)} className="h-9 text-sm" />
        <Input placeholder="Minat/personal (mis. Suka golf, baru punya anak)" value={interests} onChange={(e) => setInterests(e.target.value)} className="h-9 text-sm" />
        <div className="flex justify-end pt-1">
          <Button onClick={() => void save()} disabled={saving} className="h-9 gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <UserRoundPlus className="size-4" />}
            {saving ? "Menyimpan…" : "Simpan kontak"}
          </Button>
        </div>
      </div>
    </div>
  );
}
