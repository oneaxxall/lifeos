import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clipperClips } from "@/lib/db/schema";

/** GET /api/clipper/clips/[id]/file — download/stream file clip. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.select().from(clipperClips).where(eq(clipperClips.id, Number(id))).get();
  if (!row || !fs.existsSync(row.filePath)) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  const file = fs.readFileSync(row.filePath);
  const name = path.basename(row.filePath);
  return new NextResponse(file, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(file.length),
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
