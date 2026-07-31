"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarCheck2, ListChecks, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import type { TeamMemberItem } from "@/components/team/team-member-panel";

export interface OneOnOneItem {
  id: number;
  memberId: number;
  date: string;
  topics: string;
  actionItems: string;
  notes: string;
}

interface Props {
  members: TeamMemberItem[];
  onones: OneOnOneItem[];
  selectedId: number | null;
  onChanged: () => void;
}

const memberName = (members: TeamMemberItem[], id: number) =>
  members.find((m) => m.id === id)?.name ?? `#${id}`;

/** Catat 1-on-1 cepat + riwayat per anggota (TE-02). */
export function OneOnOnePanel({ members, onones, selectedId, onChanged }: Props) {
  const [showForm, setShowForm] = React.useState(false);
  const [memberId, setMemberId] = React.useState<number | null>(null);
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [topics, setTopics] = React.useState("");
  const [actionItems, setActionItems] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<OneOnOneItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Derived: pilihan lokal menang, fallback ke anggota terpilih dari panel kiri
  const effectiveMemberId = memberId ?? selectedId;

  const filtered = selectedId ? onones.filter((o) => o.memberId === selectedId) : onones;

  const save = async () => {
    if (!effectiveMemberId) {
      toast.error("Pilih anggota tim");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/team/onones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: effectiveMemberId, date, topics: topics.trim(), actionItems: actionItems.trim(), notes: notes.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success(`1-on-1 dengan ${memberName(members, effectiveMemberId)} tercatat 📝`);
      setTopics(""); setActionItems(""); setNotes("");
      setShowForm(false);
      onChanged();
    } catch {
      toast.error("Gagal menyimpan 1-on-1");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: OneOnOneItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/team/onones/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Catatan 1-on-1 dihapus");
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
      <div className="mb-3 flex items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CalendarCheck2 className="size-4 text-primary" /> 1-on-1
          {selectedId && (
            <Badge className="text-[9px]">{memberName(members, selectedId)}</Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>
        </p>
        <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 size-3" /> {showForm ? "Batal" : "Catat 1-on-1"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 space-y-2 rounded-lg border border-border/60 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={effectiveMemberId ?? ""}
              onChange={(e) => setMemberId(e.target.value ? Number(e.target.value) : null)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Pilih anggota…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <Input placeholder="Topik (mis. beban kerja, karier, burnout)" value={topics} onChange={(e) => setTopics(e.target.value)} className="h-9 text-sm" />
          <Textarea
            placeholder="Action items (satu per baris)…"
            rows={2}
            value={actionItems}
            onChange={(e) => setActionItems(e.target.value)}
            className="resize-none text-sm"
          />
          <Input placeholder="Catatan lain / mood anggota (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-9 text-sm" />
          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={saving} size="sm" className="h-8">
              {saving ? "Menyimpan…" : "Simpan 1-on-1"}
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 && !showForm ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {selectedId ? "Belum ada 1-on-1 untuk anggota ini." : "Belum ada 1-on-1 — catat yang pertama!"}
        </p>
      ) : (
        <ul className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
          {filtered.map((o) => (
            <li key={o.id} className="group rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="size-3.5 shrink-0 text-primary" />
                <p className="text-sm font-semibold">
                  {format(new Date(o.date), "EEEE, d MMMM yyyy", { locale: id })}
                </p>
                <span className="text-[11px] text-muted-foreground">· {memberName(members, o.memberId)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-6 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={() => setDeleteTarget(o)}
                  aria-label={`Hapus 1-on-1 ${o.date}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              {o.topics && (
                <p className="mt-1 text-sm leading-relaxed">
                  <span className="font-medium">💬</span> {o.topics}
                </p>
              )}
              {o.actionItems && (
                <div className="mt-1.5">
                  <p className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <ListChecks className="size-3" /> Action items
                  </p>
                  <ul className="space-y-0.5">
                    {o.actionItems.split("\n").filter(Boolean).map((ai, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <span className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
                        {ai}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {o.notes && (
                <p className="mt-1.5 border-t border-border/40 pt-1 text-[11px] italic text-muted-foreground">
                  📝 {o.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus catatan 1-on-1"
        description={`Hapus catatan 1-on-1 tanggal ${deleteTarget?.date}?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
