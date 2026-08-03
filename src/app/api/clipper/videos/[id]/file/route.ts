import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clipperVideos } from "@/lib/db/schema";

/** GET /api/clipper/videos/[id]/file — stream file video (preview). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.select().from(clipperVideos).where(eq(clipperVideos.id, Number(id))).get();
  if (!row || !fs.existsSync(row.filePath)) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  const file = fs.readFileSync(row.filePath);
  return new NextResponse(file, {
    headers: { "Content-Type": "video/mp4", "Content-Length": String(file.length) },
  });
}
