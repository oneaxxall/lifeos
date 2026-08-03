import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { clipperSettings } from "@/lib/db/schema";

/** GET /api/clipper/settings — settingan clipper. */
export async function GET() {
  const rows = db.select().from(clipperSettings).all();
  const s: Record<string, string> = {};
  for (const r of rows) s[r.key] = r.value;
  return NextResponse.json({ data: s });
}

/** PUT /api/clipper/settings — simpan settingan (mis. cookiesPath). */
export async function PUT(req: NextRequest) {
  try {
    const b = await req.json();
    const upsert = (key: string, value: string) => {
      const existing = db.select().from(clipperSettings).where(eq(clipperSettings.key, key)).get();
      if (existing) {
        db.update(clipperSettings).set({ value, updatedAt: sql`(datetime('now'))` }).where(eq(clipperSettings.key, key)).run();
      } else {
        db.insert(clipperSettings).values({ key, value }).run();
      }
    };
    if (typeof b.cookiesPath === "string") upsert("cookies_path", b.cookiesPath.trim());
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan setting" }, { status: 500 });
  }
}
