import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliateProducts } from "@/lib/db/schema";
import { analyzeAffiliateProduct } from "@/lib/ai/content-ai";

/** GET /api/content/products — daftar produk affiliate. */
export async function GET() {
  const rows = db.select().from(affiliateProducts).orderBy(desc(affiliateProducts.id)).all();
  return NextResponse.json({ data: rows });
}

/** POST /api/content/products — tambah produk + analisa AI (opsional). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product = String(body.product || "").trim();
    const marketplace = String(body.marketplace || "tiktok-shop").trim();
    const price = Math.max(0, Number(body.price) || 0);
    const link = String(body.link || "").trim();
    const ideaId = body.ideaId ? Number(body.ideaId) : null;
    const scriptId = body.scriptId ? Number(body.scriptId) : null;
    if (!product) return NextResponse.json({ error: "Tulis dulu nama produknya" }, { status: 400 });

    // Analisa AI (best-effort — gagal tidak menghalangi simpan)
    let analysis = "";
    let commissionPct = Math.min(50, Math.max(1, Number(body.commissionPct) || 5));
    if (body.withAI !== false) {
      try {
        const result = await analyzeAffiliateProduct(product, marketplace, price);
        if (result.ok && result.data) {
          analysis = JSON.stringify(result.data);
          const match = result.data.estimasiKomisi.match(/(\d{1,2})\s*%/);
          if (match) commissionPct = Math.min(50, Math.max(1, Number(match[1])));
        }
      } catch {
        // AI gagal → lanjut simpan manual
      }
    }

    const row = db
      .insert(affiliateProducts)
      .values({
        product,
        marketplace,
        link,
        price,
        commissionPct,
        analysis,
        ideaId,
        scriptId,
      })
      .returning()
      .get();
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan produk" }, { status: 500 });
  }
}
