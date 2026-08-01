import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carouselSettings } from "@/lib/db/schema";

/** GET /api/carousel-settings — branding (1 baris, fallback default). */
export async function GET() {
  const row = db.select().from(carouselSettings).limit(1).get();
  return NextResponse.json({
    data: row ?? {
      brandName: "LifeOS",
      handle: "@lifeos",
      tagline: "",
      initials: "L",
      showBranding: true,
    },
  });
}

/** PUT /api/carousel-settings — simpan/upsert branding. */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const values = {
      brandName: typeof body.brandName === "string" ? body.brandName.trim().slice(0, 40) : "LifeOS",
      handle: typeof body.handle === "string" ? body.handle.trim().slice(0, 40) : "@lifeos",
      tagline: String(body.tagline || "").slice(0, 80),
      initials: String(body.initials || "L").slice(0, 3),
      showBranding: body.showBranding !== false,
    };
    const existing = db.select().from(carouselSettings).limit(1).get();
    if (existing) {
      db.update(carouselSettings).set(values).where(eq(carouselSettings.id, existing.id)).run();
    } else {
      db.insert(carouselSettings).values(values).run();
    }
    return NextResponse.json({ ok: true, data: values });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan branding" }, { status: 500 });
  }
}
