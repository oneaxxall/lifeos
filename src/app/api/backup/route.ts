import { NextRequest, NextResponse } from "next/server";
import {
  deleteBackupFile,
  getBackupStats,
  listBackupFiles,
  saveBackupFile,
  dumpAllTables,
} from "@/lib/db/backup";

/**
 * GET /api/backup — statistik tabel + riwayat file backup lokal.
 * POST /api/backup — buat backup baru (simpan ke data/backups/).
 * DELETE /api/backup?name=... — hapus file backup.
 */
export async function GET() {
  const stats = getBackupStats();
  const history = listBackupFiles();
  return NextResponse.json({ stats, history });
}

export async function POST() {
  const payload = dumpAllTables();
  const file = saveBackupFile(payload);
  const stats = getBackupStats();
  return NextResponse.json({ ok: true, file, stats });
}

export async function DELETE(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ ok: false, error: "Nama file diperlukan" }, { status: 400 });
  }
  const deleted = deleteBackupFile(name);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "File tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
