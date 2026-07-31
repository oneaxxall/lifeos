import { NextRequest, NextResponse } from "next/server";
import { readBackupFile, restoreFromPayload } from "@/lib/db/backup";

/**
 * POST /api/backup/restore — pulihkan data.
 * Body: { payload: Record<string, unknown[]> } (dari upload file)
 *   atau { name: string } (dari file backup lokal).
 */
export async function POST(req: NextRequest) {
  let body: { payload?: Record<string, unknown[]>; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body tidak valid" }, { status: 400 });
  }

  let payload: Record<string, unknown[]> | null = null;

  if (body.name) {
    payload = readBackupFile(body.name);
    if (!payload) {
      return NextResponse.json({ ok: false, error: "File backup tidak ditemukan" }, { status: 404 });
    }
  } else if (body.payload && typeof body.payload === "object") {
    payload = body.payload as Record<string, unknown[]>;
  }

  if (!payload) {
    return NextResponse.json({ ok: false, error: "Payload backup tidak ada" }, { status: 400 });
  }

  // Validasi ringan: minimal ada satu tabel berisi array
  const tables = Object.keys(payload);
  if (tables.length === 0) {
    return NextResponse.json({ ok: false, error: "Backup kosong / tidak valid" }, { status: 400 });
  }

  const result = restoreFromPayload(payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
