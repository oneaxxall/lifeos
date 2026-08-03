import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { clipperSettings } from "@/lib/db/schema";

/** POST /api/clipper/settings/upload — upload file cookie (FormData: file) → data/cookies.txt */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "File cookie tidak valid" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File terlalu besar (maks 5MB)" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const dest = path.join(process.cwd(), "data", "cookies.txt");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);

    // Validasi isi: format Netscape + baris youtube + indikator sesi login
    const text = buf.toString("utf8");
    const lines = text.split("\n").filter((l) => l && !l.startsWith("#"));
    const hasYt = lines.some((l) => l.includes("youtube.com"));
    const hasSid = lines.some((l) => l.includes("SID") || l.includes("__Secure-1PSID") || l.includes("LOGIN_INFO"));
    const valid = hasYt && hasSid;

    // Simpan path ke settings
    const existing = db.select().from(clipperSettings).where(eq(clipperSettings.key, "cookies_path")).get();
    if (existing) {
      db.update(clipperSettings).set({ value: dest, updatedAt: sql`(datetime('now'))` }).where(eq(clipperSettings.key, "cookies_path")).run();
    } else {
      db.insert(clipperSettings).values({ key: "cookies_path", value: dest }).run();
    }
    return NextResponse.json({ ok: true, path: dest, size: buf.length, lines: lines.length, valid, hasYt, hasSid });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan file cookie" }, { status: 500 });
  }
}

/** DELETE /api/clipper/settings/upload — hapus file cookie & setting. */
export async function DELETE() {
  try {
    const dest = path.join(process.cwd(), "data", "cookies.txt");
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    db.delete(clipperSettings).where(eq(clipperSettings.key, "cookies_path")).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus cookie" }, { status: 500 });
  }
}
