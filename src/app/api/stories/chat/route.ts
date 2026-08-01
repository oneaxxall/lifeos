import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { generateText } from "ai";
import { getModel } from "@/lib/ai/provider";
import { buildCompanionPrompt } from "@/lib/ai/story-companion";
import { db } from "@/lib/db";
import { lifeChats, lifeProfiles, lifeStories } from "@/lib/db/schema";

/** GET /api/stories/chat?age=20 — riwayat percakapan stage usia (tersimpan permanen). */
export async function GET(req: NextRequest) {
  const age = Number(req.nextUrl.searchParams.get("age"));
  if (!Number.isFinite(age) || age <= 0) {
    return NextResponse.json({ error: "Usia wajib diisi" }, { status: 400 });
  }
  const rows = db
    .select()
    .from(lifeChats)
    .where(eq(lifeChats.age, Math.round(age)))
    .orderBy(asc(lifeChats.id))
    .all();

  const history = rows.map((r) => ({
    id: r.id,
    role: r.role,
    content: r.content,
    createdAt: r.createdAt,
  }));
  return NextResponse.json({ data: history });
}

/**
 * POST /api/stories/chat — AI teman curhat dengan STREAMING token real-time.
 * Pesan user & balasan AI DISIMPAN permanen per stage.
 * Response: text/plain stream (chunk per token), balasan disimpan setelah stream selesai.
 */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const age = Number(b.age);
    const message = String(b.message || "").trim();
    if (!Number.isFinite(age) || age <= 0) {
      return NextResponse.json({ error: "Usia wajib diisi" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "Tulis pesan dulu" }, { status: 400 });
    }
    const ageInt = Math.round(age);

    // Konteks: semua cerita di stage usia tersebut
    const rows = db.select().from(lifeStories).where(eq(lifeStories.age, ageInt)).all();
    const stories = rows.map((r) => ({
      id: r.id,
      age: r.age,
      title: r.title,
      category: r.category,
      actors: r.actors ?? "",
      story: r.story,
    }));

    // Konteks profil hidup — akar pemahaman AI
    const profileRow = db.select().from(lifeProfiles).orderBy(desc(lifeProfiles.updatedAt)).limit(1).get();
    const profile = profileRow
      ? {
          birthDate: profileRow.birthDate ?? "",
          values: profileRow.values ?? "",
          childhoodWounds: profileRow.childhoodWounds ?? "",
          parenting: profileRow.parenting ?? "",
          family: profileRow.family ?? "",
          lifeNotes: profileRow.lifeNotes ?? "",
        }
      : null;

    // Riwayat dari DB (bukan dari client) — jaga konsistensi
    const historyRows = db
      .select()
      .from(lifeChats)
      .where(eq(lifeChats.age, ageInt))
      .orderBy(asc(lifeChats.id))
      .all();
    const history = historyRows.slice(-6).map((h) => ({
      role: h.role,
      content: h.content,
    }));

    // Simpan pesan user
    db.insert(lifeChats)
      .values({ age: ageInt, role: "user", content: message.slice(0, 4000) })
      .run();

    const { system, user } = buildCompanionPrompt({
      age: ageInt,
      stories,
      profile,
      history,
      message: message.slice(0, 4000),
    });

    // generateText (terbukti kompatibel dengan gateway opencode) → pseudo-stream
    // chunk kata-per-kata agar UI menampilkan token real-time seperti streaming asli.
    const model = getModel();
    const { text } = await generateText({ model, system, prompt: user, temperature: 0.8 });
    const full = text.trim() || "Aku mendengarkan. Ceritakan lebih lanjut, aku di sini untukmu. 💛";

    // Simpan balasan AI
    db.insert(lifeChats)
      .values({ age: ageInt, role: "assistant", content: full.slice(0, 8000) })
      .run();

    // Kirim sebagai stream dengan chunk kecil (efek mengetik real-time)
    const chunks: string[] = [];
    for (let i = 0; i < full.length; i += 6) chunks.push(full.slice(i, i + 6));
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
          // delay kecil antar chunk (max ~3 detik total)
          await new Promise((r) => setTimeout(r, Math.min(30, 3000 / chunks.length)));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("POST /api/stories/chat error:", err);
    return NextResponse.json({ error: "Gagal memproses curhat" }, { status: 500 });
  }
}
