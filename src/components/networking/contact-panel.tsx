"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Building2,
  Handshake,
  MapPin,
  Search,
  Trash2,
  UserCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ContactItem {
  id: number;
  name: string;
  role: string;
  company: string;
  context: string;
  interests: string;
  priority: string;
  lastContact: string;
}

interface Props {
  items: ContactItem[];
  onChanged: () => void;
}

const PRIORITY_META: Record<string, { label: string; className: string }> = {
  penting: { label: "Penting", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  sedang: { label: "Sedang", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  ringan: { label: "Ringan", className: "bg-muted text-muted-foreground" },
};

const DAYS_TO_COLD = 90;

function daysSince(dateStr: string): number | null {
  if (!dateStr) return null;
  return Math.max(0, Math.round((Date.now() - new Date(dateStr + "T00:00:00").getTime()) / 86400000));
}

/** Status follow-up: belum pernah / perlu (>90 hari) / hangat (≤90 hari). */
function followUpStatus(item: ContactItem): { key: string; label: string; className: string } {
  const days = daysSince(item.lastContact);
  if (days === null) return { key: "belum", label: "Belum pernah dihubungi", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400" };
  if (days > DAYS_TO_COLD) return { key: "perlu", label: `Perlu follow-up · +${days} hari`, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
  return { key: "hangat", label: days === 0 ? "Baru dihubungi" : `${days} hari lalu`, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
}

/** Kontak profesional — tampilan CARD grid 3 kolom + filter lengkap + follow-up tracker. */
export function ContactPanel({ items, onChanged }: Props) {
  const [deleteTarget, setDeleteTarget] = React.useState<ContactItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // ── Filter state ──
  const [query, setQuery] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [followFilter, setFollowFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"follow" | "prioritas" | "nama">("follow");

  const markContacted = async (item: ContactItem) => {
    const res = await fetch(`/api/networking/contacts/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastContact: new Date().toISOString().slice(0, 10) }),
    });
    if (res.ok) {
      toast.success(`Sudah dihubungi ✓ — timer ${item.name} di-reset`);
      onChanged();
    } else {
      toast.error("Gagal memperbarui");
    }
  };

  const remove = async (item: ContactItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/networking/contacts/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Kontak dihapus");
      setDeleteTarget(null);
      onChanged();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  // ── Filter + sort ──
  const filtered = React.useMemo(() => {
    let list = items.filter((it) => {
      const q = query.trim().toLowerCase();
      if (q) {
        const hay = `${it.name} ${it.role} ${it.company} ${it.context} ${it.interests}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (priorityFilter !== "all" && it.priority !== priorityFilter) return false;
      const st = followUpStatus(it).key;
      if (followFilter === "perlu" && st !== "perlu") return false;
      if (followFilter === "belum" && st !== "belum") return false;
      if (followFilter === "hangat" && st !== "hangat") return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "nama") return a.name.localeCompare(b.name);
      if (sortBy === "prioritas") {
        const rank = { penting: 0, sedang: 1, ringan: 2 } as Record<string, number>;
        return (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);
      }
      // follow: belum pernah dulu, lalu paling lama
      const da = daysSince(a.lastContact);
      const db = daysSince(b.lastContact);
      if (da === null && db === null) return 0;
      if (da === null) return -1;
      if (db === null) return 1;
      return db - da;
    });
    return list;
  }, [items, query, priorityFilter, followFilter, sortBy]);

  const needFollowCount = items.filter((i) => followUpStatus(i).key === "perlu").length;
  const neverCount = items.filter((i) => followUpStatus(i).key === "belum").length;
  const filteredCount = filtered.length;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* ── Header + statistik ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Handshake className="size-4 text-primary" /> Kontak
          <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
            🔥 Perlu follow-up <b>{needFollowCount}</b>
          </span>
          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-600 dark:text-rose-400">
            🆕 Belum pernah <b>{neverCount}</b>
          </span>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama / perusahaan / minat…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="Filter prioritas"
        >
          <option value="all">⭐ Semua prioritas</option>
          <option value="penting">Penting</option>
          <option value="sedang">Sedang</option>
          <option value="ringan">Ringan</option>
        </select>
        <select
          value={followFilter}
          onChange={(e) => setFollowFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="Filter follow-up"
        >
          <option value="all">🤝 Semua follow-up</option>
          <option value="perlu">🔥 Perlu follow-up</option>
          <option value="belum">🆕 Belum pernah</option>
          <option value="hangat">💚 Hangat</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "follow" | "prioritas" | "nama")}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="Urutkan"
        >
          <option value="follow">🕐 Follow-up terdekat</option>
          <option value="prioritas">⭐ Prioritas</option>
          <option value="nama">🔤 Nama A-Z</option>
        </select>
        {filteredCount !== items.length && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[11px] text-muted-foreground"
            onClick={() => {
              setQuery("");
              setPriorityFilter("all");
              setFollowFilter("all");
            }}
          >
            Reset
          </Button>
        )}
      </div>

      <p className="mb-2 text-[11px] text-muted-foreground">
        Menampilkan <b className="text-foreground">{filteredCount}</b> dari {items.length} kontak
      </p>

      {/* ── Grid card 3 kolom (desktop) ── */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {items.length === 0
            ? "Belum ada kontak — tambahkan relasi pertamamu."
            : "Tidak ada kontak yang cocok dengan filter. 🔍"}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const days = daysSince(item.lastContact);
            const meta = PRIORITY_META[item.priority] ?? PRIORITY_META.sedang;
            const st = followUpStatus(item);
            const initials = item.name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join("");
            return (
              <li
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-border/60 transition-colors hover:border-primary/25 hover:bg-muted/20"
              >
                {/* Header: avatar + nama + prioritas */}
                <div className="flex items-center gap-2.5 border-b border-border/50 px-3 py-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {initials || <UserRound className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {[item.role, item.company].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge className={`text-[8px] ${meta.className}`}>{meta.label}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      onClick={() => setDeleteTarget(item)}
                      aria-label={`Hapus kontak ${item.name}`}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>

                {/* Isi card */}
                <div className="flex-1 space-y-1 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  {item.context && (
                    <p className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 size-3 shrink-0" /> {item.context}
                    </p>
                  )}
                  {item.interests && (
                    <p className="flex items-start gap-1.5">
                      <Building2 className="mt-0.5 size-3 shrink-0" /> {item.interests}
                    </p>
                  )}
                  {item.lastContact && (
                    <p className="flex items-start gap-1.5">
                      <UserCheck className="mt-0.5 size-3 shrink-0" />
                      <span>
                        Terakhir kontak:{" "}
                        {days !== null ? `${days} hari lalu` : "—"} ({format(new Date(item.lastContact), "d MMM yyyy", { locale: id })})
                      </span>
                    </p>
                  )}
                </div>

                {/* Footer: status follow-up + aksi */}
                <div className="flex items-center gap-1.5 border-t border-border/50 bg-muted/20 px-3 py-2">
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", st.className)}>
                    {st.label}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto h-6 gap-1 px-2 text-[10px]"
                    onClick={() => void markContacted(item)}
                  >
                    <UserCheck className="size-3" /> Hubungi
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus kontak"
        description={`Hapus kontak "${deleteTarget?.name}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        busy={deleting}
        onConfirm={() => deleteTarget && void remove(deleteTarget)}
      />
    </div>
  );
}
