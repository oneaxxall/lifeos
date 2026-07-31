import { NextResponse } from "next/server";
import { dumpAllTables } from "@/lib/db/backup";

/** GET /api/backup/export — unduh JSON berisi seluruh data LifeOS. */
export async function GET() {
  const payload = dumpAllTables();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const json = JSON.stringify(
    {
      app: "lifeos",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: payload,
    },
    null,
    2
  );
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="lifeos-backup-${stamp}.json"`,
    },
  });
}
