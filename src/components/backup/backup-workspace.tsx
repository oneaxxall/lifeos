"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  ArchiveRestore,
  DatabaseBackup,
  Download,
  HardDriveDownload,
  History,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface BackupStatsTable {
  table: string;
  count: number;
}

interface BackupFile {
  name: string;
  size: number;
  createdAt: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** Halaman Backup & Restore — data LifeOS (BKP-01..04). */
export function BackupWorkspace() {
  const [stats, setStats] = React.useState<BackupStatsTable[]>([]);
  const [history, setHistory] = React.useState<BackupFile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [restoring, setRestoring] = React.useState(false);
  const [uploadName, setUploadName] = React.useState<string | null>(null);
  const [uploadStats, setUploadStats] = React.useState<{ tables: number; rows: number } | null>(null);
  const [uploadPayload, setUploadPayload] = React.useState<Record<string, unknown[]> | null>(null);
  const [confirmRestore, setConfirmRestore] = React.useState<{ type: "upload" | "local"; name?: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/backup");
    const json = await res.json();
    setStats(json.stats?.tables ?? []);
    setHistory(json.history ?? []);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/backup")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setStats(json.stats?.tables ?? []);
        setHistory(json.history ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalRows = stats.reduce((a, s) => a + s.count, 0);

  const createBackup = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        toast.success("Backup berhasil dibuat");
        await load();
      } else {
        toast.error(json.error || "Gagal membuat backup");
      }
    } catch {
      toast.error("Gagal terhubung ke server");
    } finally {
      setCreating(false);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = String(reader.result);
        const parsed = JSON.parse(text);
        const data = parsed?.data ?? parsed;
        if (!data || typeof data !== "object") {
          toast.error("File bukan backup LifeOS yang valid");
          return;
        }
        const tables = Object.keys(data).filter((k) => Array.isArray(data[k]));
        const rows = tables.reduce((a, k) => a + (data[k] as unknown[]).length, 0);
        if (tables.length === 0) {
          toast.error("Backup tidak berisi tabel data");
          return;
        }
        setUploadName(file.name);
        setUploadStats({ tables: tables.length, rows });
        setUploadPayload(data as Record<string, unknown[]>);
        toast.success(`File siap: ${file.name}`);
      } catch {
        toast.error("File bukan JSON yang valid");
      }
    };
    reader.readAsText(file);
  };

  const doRestore = async () => {
    if (!confirmRestore) return;
    setRestoring(true);
    try {
      const body =
        confirmRestore.type === "local"
          ? { name: confirmRestore.name }
          : { payload: uploadPayload };
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(
          `Data dipulihkan: ${json.tablesRestored} tabel, ${json.rowsRestored} baris`
        );
        setUploadName(null);
        setUploadStats(null);
        setUploadPayload(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await load();
      } else {
        toast.error(json.error || "Gagal restore");
      }
    } catch {
      toast.error("Gagal terhubung ke server");
    } finally {
      setRestoring(false);
      setConfirmRestore(null);
    }
  };

  const deleteFile = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/backup?name=${encodeURIComponent(deleteTarget)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("File backup dihapus");
        await load();
      } else {
        toast.error(json.error || "Gagal menghapus");
      }
    } catch {
      toast.error("Gagal terhubung ke server");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <Loader2 className="size-4 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Memuat data backup…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Ringkasan */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <DatabaseBackup className="size-4" /> Tabel tercadangkan
          </div>
          <p className="mt-1.5 text-2xl font-bold">{stats.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <HardDriveDownload className="size-4" /> Total baris data
          </div>
          <p className="mt-1.5 text-2xl font-bold">{totalRows.toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <History className="size-4" /> File backup lokal
          </div>
          <p className="mt-1.5 text-2xl font-bold">{history.length}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Backup */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary" /> Backup data
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Simpan snapshot semua data LifeOS ke file lokal atau unduh JSON.
            </p>
          </div>
          <div className="space-y-3 p-4">
            <Button onClick={createBackup} disabled={creating} className="w-full">
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <DatabaseBackup className="size-4" />
              )}
              {creating ? "Membuat backup…" : "Buat backup sekarang"}
            </Button>
            <Button variant="outline" asChild className="w-full">
              <a href="/api/backup/export">
                <Download className="size-4" /> Unduh file JSON
              </a>
            </Button>

            {/* Riwayat file lokal */}
            <div className="pt-2">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Riwayat backup lokal
              </p>
              {history.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  Belum ada backup lokal. Klik &quot;Buat backup sekarang&quot;.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {history.map((f) => (
                    <li
                      key={f.name}
                      className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(f.createdAt), "d MMM yyyy, HH:mm", { locale: id })} ·{" "}
                          {formatBytes(f.size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={`Pulihkan ${f.name}`}
                        onClick={() => setConfirmRestore({ type: "local", name: f.name })}
                      >
                        <ArchiveRestore className="size-3.5 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={`Hapus ${f.name}`}
                        onClick={() => setDeleteTarget(f.name)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Restore */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ArchiveRestore className="size-4 text-primary" /> Restore data
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pulihkan data dari file JSON backup. Data saat ini akan diganti.
            </p>          </div>
          <div className="space-y-3 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" /> Pilih file backup (.json)
            </Button>

            {uploadName && uploadStats && (
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs">
                <p className="font-medium">{uploadName}</p>
                <p className="mt-1 text-muted-foreground">
                  {uploadStats.tables} tabel · {uploadStats.rows.toLocaleString("id-ID")} baris data
                </p>
                <Button
                  className="mt-2 w-full"
                  size="sm"
                  disabled={restoring}
                  onClick={() => setConfirmRestore({ type: "upload" })}
                >
                  {restoring ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ArchiveRestore className="size-3.5" />
                  )}
                  Pulihkan data ini
                </Button>
              </div>
            )}

            {/* Statistik tabel */}
            <div className="pt-2">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Isi backup (per tabel)
              </p>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-border/70">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-1.5 font-medium">Tabel</th>
                      <th className="px-3 py-1.5 text-right font-medium">Baris</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s) => (
                      <tr key={s.table} className="border-t border-border/60">
                        <td className="px-3 py-1.5 font-mono text-[10px]">{s.table}</td>
                        <td className="px-3 py-1.5 text-right">
                          {s.count > 0 ? (
                            <Badge variant="secondary" className="text-[9px]">
                              {s.count.toLocaleString("id-ID")}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Konfirmasi restore */}
      <ConfirmDialog
        open={confirmRestore !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmRestore(null);
        }}
        title="Pulihkan data?"
        description={
          confirmRestore?.type === "local"
            ? `Semua data LifeOS saat ini akan DIGANTI dengan isi file "${confirmRestore.name}". Tindakan ini tidak bisa dibatalkan.`
            : "Semua data LifeOS saat ini akan DIGANTI dengan isi file backup yang dipilih. Tindakan ini tidak bisa dibatalkan."
        }
        confirmLabel={restoring ? "Memulihkan…" : "Ya, pulihkan"}
        destructive
        busy={restoring}
        onConfirm={doRestore}
      />

      {/* Konfirmasi hapus file */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Hapus file backup?"
        description={`File "${deleteTarget}" akan dihapus permanen.`}
        confirmLabel={deleting ? "Menghapus…" : "Ya, hapus"}
        destructive
        busy={deleting}
        onConfirm={deleteFile}
      />
    </div>
  );
}
