import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timeBlocks } from "@/lib/db/schema";
import { listTimeBlocks } from "@/lib/db/time-repo";

/** GET /api/time/blocks?day=YYYY-MM-DD — time block per hari */
export async function GET(req: NextRequest) {
  const day = req.nextUrl.searchParams.get("day") || new Date().toISOString().slice(0, 10);
  return NextResponse.json({ data: listTimeBlocks(day) });
}

/** POST /api/time/blocks — buat time block */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const day = String(body.day || new Date().toISOString().slice(0, 10));
    const startTime = String(body.startTime || "");
    const endTime = String(body.endTime || "");
    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: "Judul & jam wajib diisi" }, { status: 400 });
    }
    const row = db
      .insert(timeBlocks)
      .values({
        title,
        categoryId: body.categoryId ? Number(body.categoryId) : null,
        day,
        startTime,
        endTime,
      })
      .returning()
      .get();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/time/blocks error:", err);
    return NextResponse.json({ error: "Gagal menyimpan time block" }, { status: 500 });
  }
}
