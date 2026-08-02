import { generateText } from "ai";
import { eq, like } from "drizzle-orm";
import { z } from "zod";
import { getChatModel } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { todos, financeTransactions, financeCategories, knowledge } from "@/lib/db/schema";

/* ═══════════ Aksi AI (LifeOS Chat → create record) ═══════════ */

export const ChatActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_todo"),
    title: z.string().describe("Judul todo singkat"),
    priority: z.enum(["tinggi", "sedang", "rendah"]).optional(),
    dueDate: z.string().optional().describe("Tanggal jatuh tempo YYYY-MM-DD, opsional"),
    description: z.string().optional(),
  }),
  z.object({
    action: z.literal("create_transaction"),
    amount: z.number().positive().describe("Nominal rupiah (angka murni)"),
    type: z.enum(["masuk", "keluar"]),
    description: z.string(),
    category: z.string().optional().describe("Nama kategori, opsional"),
    date: z.string().optional().describe("Tanggal YYYY-MM-DD, default hari ini"),
  }),
  z.object({
    action: z.literal("create_knowledge"),
    title: z.string(),
    content: z.string(),
  }),
  z.object({
    action: z.literal("complete_todo"),
    title: z.string().describe("Judul todo yang ditandai selesai"),
  }),
  z.object({
    action: z.literal("none"),
    reason: z.string().optional(),
  }),
]);

export type ChatAction = z.infer<typeof ChatActionSchema>;

const ACTION_KEYWORDS = /\b(buat(kan|in)?|bikin|tambah(kan|in)?|catat|catetin|simpan|rekam|input|record|selesaikan|selesain|tandai|mark|create|add)\b/i;

/** Deteksi aksi dari pesan user — hanya dipanggil jika ada kata kunci (hemat LLM). */
export async function detectChatAction(message: string, feature: string): Promise<ChatAction | null> {
  const m = message.trim();
  if (!m) return null;
  // Tanpa kata kunci aksi → langsung none (tanpa panggil LLM)
  if (!ACTION_KEYWORDS.test(m)) return null;

  try {
    const model = getChatModel();
    const { text } = await generateText({
      model,
      system:
        "Kamu adalah asisten LifeOS. Analisa pesan user dalam Bahasa Indonesia: apakah user meminta MEMBUAT/MENAMBAH/MENCATAT/MENYIMPAN data, atau MENANDAI SELESAI sebuah todo? " +
        "Jika ya, TENTUKAN aksi + field yang sesuai (ambil dari kalimat user). Jika hanya bertanya/membaca/berdiskusi → action=none. " +
        "Untuk create_transaction: amount dalam angka murni rupiah (mis. '50 ribu' → 50000, '2 juta' → 2000000), type masuk/keluar. " +
        "Untuk create_todo: priority tinggi/sedang/rendah, dueDate format YYYY-MM-DD bila disebut. " +
        "Untuk complete_todo: title harus MIRIP dengan judul todo yang dimaksud user. " +
        "OUTPUT HANYA JSON (tanpa markdown fence): {\"action\":\"create_todo\",\"title\":\"...\",\"priority\":\"...\"} | {\"action\":\"create_transaction\",\"amount\":50000,\"type\":\"keluar\",\"description\":\"...\"} | {\"action\":\"create_knowledge\",\"title\":\"...\",\"content\":\"...\"} | {\"action\":\"complete_todo\",\"title\":\"...\"} | {\"action\":\"none\"}",
      prompt: `Konteks fitur aktif: ${feature}\nPesan user: "${m}"`,
      temperature: 0,
    });
    const parsed = parseActionJson(text);
    return parsed;
  } catch {
    return { action: "none" } as ChatAction;
  }
}

/** Parse JSON output LLM (toleran markdown fence) + validasi zod. */
function parseActionJson(text: string): ChatAction | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const result = ChatActionSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Eksekusi aksi → tulis DB → kembalikan pesan hasil. */
export async function executeChatAction(action: ChatAction): Promise<{ ok: boolean; message: string }> {
  try {
    switch (action.action) {
      case "create_todo": {
        db.insert(todos)
          .values({
            title: action.title,
            priority: action.priority ?? "sedang",
            dueDate: action.dueDate ?? "",
            description: action.description ?? "",
          })
          .run();
        return { ok: true, message: `Todo "${action.title}" berhasil dibuat.` };
      }
      case "create_transaction": {
        let categoryId: number | null = null;
        if (action.category) {
          const cat = db
            .select()
            .from(financeCategories)
            .where(like(financeCategories.name, action.category.trim()))
            .limit(1)
            .get();
          categoryId = cat?.id ?? null;
        }
        db.insert(financeTransactions)
          .values({
            amount: Math.round(action.amount),
            type: action.type,
            description: action.description,
            categoryId,
            date: action.date ?? new Date().toISOString().slice(0, 10),
          })
          .run();
        return { ok: true, message: `Transaksi ${action.type === "masuk" ? "pemasukan" : "pengeluaran"} ${Math.round(action.amount).toLocaleString("id-ID")} dicatat.` };
      }
      case "create_knowledge": {
        db.insert(knowledge).values({ title: action.title, content: action.content }).run();
        return { ok: true, message: `Catatan "${action.title}" disimpan ke Knowledge.` };
      }
      case "complete_todo": {
        const row = db.select().from(todos).where(like(todos.title, `%${action.title}%`)).limit(1).get();
        if (!row) return { ok: false, message: `Todo "${action.title}" tidak ditemukan.` };
        db.update(todos).set({ status: "done" }).where(eq(todos.id, row.id)).run();
        return { ok: true, message: `Todo "${row.title}" ditandai selesai. 🎉` };
      }
      default:
        return { ok: false, message: "Tidak ada aksi untuk dieksekusi." };
    }
  } catch (e) {
    return { ok: false, message: `Gagal eksekusi: ${e instanceof Error ? e.message : "error"}` };
  }
}
