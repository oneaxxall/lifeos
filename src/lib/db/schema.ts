import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/* ═══════════ Knowledge (Second Brain) ═══════════ */

export const knowledge = sqliteTable("knowledge", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  source: text("source").default(""),
  summary: text("summary").default(""), // diisi AI
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Categories & Tags (many-to-many) ═══════════ */

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const knowledgeCategories = sqliteTable("knowledge_categories", {
  knowledgeId: integer("knowledge_id")
    .notNull()
    .references(() => knowledge.id, { onDelete: "cascade" }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.knowledgeId, t.categoryId] })]);

export const knowledgeTags = sqliteTable("knowledge_tags", {
  knowledgeId: integer("knowledge_id")
    .notNull()
    .references(() => knowledge.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.knowledgeId, t.tagId] })]);

/* ═══════════ Todo (Kanban) ═══════════ */

export const todoStatuses = ["backlog", "todo", "in_progress", "done"] as const;
export type TodoStatus = (typeof todoStatuses)[number];

export const todos = sqliteTable("todos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").default(""),
  priority: text("priority", { enum: ["tinggi", "sedang", "rendah"] })
    .notNull()
    .default("sedang"),
  dueDate: text("due_date").default(""), // ISO date
  estimateMinutes: integer("estimate_minutes").default(0),
  status: text("status", { enum: todoStatuses })
    .notNull()
    .default("backlog"),
  /** Urutan dalam kolom kanban (drag & drop) */
  position: integer("position").notNull().default(0),
  /** Tugas induk (sub-langkah dari breakdown AI, TDO-06).
   *  FK ke todos.id ditambahkan manual di migrasi (self-reference). */
  parentId: integer("parent_id"),
  area: text("area").default(""), // kerja, keluarga, kesehatan, dll.
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  completedAt: text("completed_at").default(""),
});

/* ═══════════ Finance (Transaksi & Kategori) ═══════════ */

export const financeCategories = sqliteTable("finance_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  /** Jenis kategori: pemasukan | pengeluaran */
  type: text("type", { enum: ["masuk", "keluar"] }).notNull().default("keluar"),
  icon: text("icon").default(""), // nama ikon lucide (opsional)
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const financeTransactions = sqliteTable("finance_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Nominal dalam Rupiah (selalu positif; arah ditentukan `type`) */
  amount: integer("amount").notNull(),
  type: text("type", { enum: ["masuk", "keluar"] }).notNull().default("keluar"),
  description: text("description").default(""),
  categoryId: integer("category_id").references(() => financeCategories.id, {
    onDelete: "set null",
  }),
  /** Tanggal transaksi (ISO date) — default hari ini */
  date: text("date").notNull().default(sql`(date('now'))`),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Finance: Subscription & Budget ═══════════ */

export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  /** Biaya per siklus (Rp) */
  amount: integer("amount").notNull(),
  /** Siklus tagihan: bulanan | tahunan */
  cycle: text("cycle", { enum: ["bulanan", "tahunan"] }).notNull().default("bulanan"),
  /** Tanggal tagihan berikutnya (ISO date) */
  nextBillingDate: text("next_billing_date").default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const budgets = sqliteTable("budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => financeCategories.id, { onDelete: "cascade" }),
  /** Batas pengeluaran bulanan (Rp) */
  limitAmount: integer("limit_amount").notNull(),
  /** Periode budget: YYYY-MM (kosong = berlaku setiap bulan) */
  period: text("period").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Time Management ═══════════ */

export const activityCategories = sqliteTable("activity_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  /** Nilai aktivitas: produktif | netral | buang */
  value: text("value", { enum: ["produktif", "netral", "buang"] })
    .notNull()
    .default("netral"),
  /** Warna aksen (hex) untuk chart/timeline */
  color: text("color").default("#0D9488"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => activityCategories.id, {
    onDelete: "set null",
  }),
  /** Deskripsi/notes aktivitas (textarea) */
  description: text("description").default(""),
  /** Tags (JSON array string, mis. ["kerja","deep-work"]) */
  tags: text("tags").default("[]"),
  /** Waktu mulai (ISO datetime) */
  startedAt: text("started_at").notNull(),
  /** Waktu selesai (ISO datetime) — null = masih berjalan */
  endedAt: text("ended_at").default(""),
  /** Durasi dalam menit (dihitung saat stop / dihitung manual) */
  durationMinutes: integer("duration_minutes").default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const timeBlocks = sqliteTable("time_blocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  categoryId: integer("category_id").references(() => activityCategories.id, {
    onDelete: "set null",
  }),
  /** Hari blok (YYYY-MM-DD) */
  day: text("day").notNull(),
  /** Jam mulai (HH:MM) */
  startTime: text("start_time").notNull(),
  /** Jam selesai (HH:MM) */
  endTime: text("end_time").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Health ═══════════ */

export const healthEntries = sqliteTable("health_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Tanggal entri (ISO date) — unik per hari */
  date: text("date").notNull().unique(),
  weightKg: integer("weight_kg").default(0),
  /** Tidur dalam jam (mis. 7.5) */
  sleepHours: integer("sleep_hours").default(0),
  /** Olahraga dalam menit */
  exerciseMinutes: integer("exercise_minutes").default(0),
  /** Jumlah langkah */
  steps: integer("steps").default(0),
  /** Gelas air */
  waterGlasses: integer("water_glasses").default(0),
  notes: text("notes").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const healthGoals = sqliteTable("health_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Berat target (kg) */
  goalWeightKg: integer("goal_weight_kg").default(0),
  /** Target olahraga per minggu (menit) */
  exercisePerWeekMinutes: integer("exercise_per_week_minutes").default(0),
  /** Target tidur per malam (jam) */
  sleepTargetHours: integer("sleep_target_hours").default(0),
  /** Target langkah per hari */
  dailyStepsTarget: integer("daily_steps_target").default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Mental Health ═══════════ */

export const moodEntries = sqliteTable("mood_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Tanggal mood (ISO date) — unik per hari */
  date: text("date").notNull().unique(),
  /** Mood 1-5 (1=sangat buruk … 5=sangat baik) */
  mood: integer("mood").notNull(),
  /** Catatan singkat (opsional) */
  note: text("note").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const journalEntries = sqliteTable("journal_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().default(sql`(date('now'))`),
  content: text("content").notNull(),
  /** Prompt refleksi yang dipakai (untuk konteks) */
  prompt: text("prompt").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Sick (Catatan tidak enak badan) ═══════════ */

export const sickEntries = sqliteTable("sick_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Gejala yang dirasakan (teks bebas) */
  symptoms: text("symptoms").notNull(),
  /** Durasi sudah merasa begini (mis. "2 hari") */
  duration: text("duration").default(""),
  /** Catatan tambahan (opsional) */
  notes: text("notes").default(""),
  /** Hasil analisa AI (teks) */
  aiAdvice: text("ai_advice").default(""),
  /** Saran AI: butuh profesional? */
  needsProfessional: integer("needs_professional", { mode: "boolean" }).notNull().default(false),
  date: text("date").notNull().default(sql`(date('now'))`),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Family (Curhatan & Jurnal Keluarga) ═══════════ */

export const familyEntries = sqliteTable("family_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Curhatan / cerita keluarga (teks bebas) */
  content: text("content").notNull(),
  /** Konteks: siapa yang terlibat (pasangan, anak, orang tua, mertua…) */
  people: text("people").default(""),
  /** Suasana hati saat curhat (opsional) */
  mood: text("mood").default(""),
  /** Hasil nasihat AI (teks) */
  aiAdvice: text("ai_advice").default(""),
  date: text("date").notNull().default(sql`(date('now'))`),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Spiritual ═══════════ */

/** Ritual harian default — checklist per hari */
export const SPIRITUAL_RITUALS = [
  { key: "sholat", label: "Sholat 5 waktu", icon: "🕌" },
  { key: "quran", label: "Baca Al-Quran", icon: "📖" },
  { key: "dzikir", label: "Dzikir pagi/petang", icon: "📿" },
  { key: "doa", label: "Doa & munajat", icon: "🤲" },
] as const;

export type SpiritualRitualKey = (typeof SPIRITUAL_RITUALS)[number]["key"];

export const spiritualEntries = sqliteTable("spiritual_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Tanggal (ISO date) — unik per hari */
  date: text("date").notNull().unique(),
  /** Checklist ritual: JSON {"sholat":true,"quran":false,...} */
  rituals: text("rituals").notNull().default("{}"),
  /** Kualitas ibadah (1-5, opsional) */
  quality: integer("quality").default(0),
  /** Refleksi singkat (opsional) */
  reflection: text("reflection").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const spiritualGoals = sqliteTable("spiritual_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Target khatam Quran (juz) */
  quranKhatamJuz: integer("quran_khatam_juz").default(0),
  /** Target baca Quran per minggu (menit) */
  weeklyReadMinutes: integer("weekly_read_minutes").default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Business ═══════════ */

export const businessIdeas = sqliteTable("business_ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  /** Deskripsi singkat / potensi */
  description: text("description").default(""),
  /** Status: baru | dieksekusi | berhenti */
  status: text("status").notNull().default("baru"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/** Tahap proyek bisnis */
export const PROJECT_STAGES = ["riset", "mvp", "luncur", "tumbuh"] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const businessProjects = sqliteTable("business_projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  /** Tahap: riset | mvp | luncur | tumbuh */
  stage: text("stage").notNull().default("riset"),
  /** Target (teks bebas, mis. "100 user pertama") */
  target: text("target").default(""),
  /** Deadline (ISO date, opsional) */
  deadline: text("deadline").default(""),
  /** Aktif? (untuk filter prioritas) */
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Networking ═══════════ */

/** Prioritas relasi */
export const CONTACT_PRIORITIES = ["penting", "sedang", "ringan"] as const;
export type ContactPriority = (typeof CONTACT_PRIORITIES)[number];

export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  /** Peran/jabatan */
  role: text("role").default(""),
  /** Perusahaan/instansi */
  company: text("company").default(""),
  /** Konteks kenal (mis. "Conference 2025") */
  context: text("context").default(""),
  /** Minat/personal (mis. "Suka golf, baru punya anak") */
  interests: text("interests").default(""),
  /** Prioritas relasi: penting | sedang | ringan */
  priority: text("priority").notNull().default("sedang"),
  /** Terakhir kontak (ISO date) — untuk deteksi follow-up */
  lastContact: text("last_contact").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Team Management ═══════════ */

export const teamMembers = sqliteTable("team_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  /** Peran di tim */
  role: text("role").default(""),
  /** Senioritas: junior | mid | senior | lead */
  seniority: text("seniority").notNull().default("mid"),
  /** Kekuatan / area fokus (opsional) */
  strengths: text("strengths").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const teamOneOnOnes = sqliteTable("team_one_on_ones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  /** Tanggal 1-on-1 (ISO date) */
  date: text("date").notNull(),
  /** Topik yang dibahas */
  topics: text("topics").default(""),
  /** Action items (teks bebas, dipisah baris) */
  actionItems: text("action_items").default(""),
  /** Catatan lain / mood anggota (opsional) */
  notes: text("notes").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/** Penilaian & feedback berkala (TE-05) */
export const teamFeedback = sqliteTable("team_feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  /** Periode (mis. "Q3 2026") */
  period: text("period").default(""),
  /** Penilaian 1-5 */
  rating: integer("rating").default(0),
  /** Feedback kualitatif */
  feedback: text("feedback").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Insights (Hub AI lintas fitur) ═══════════ */

export const insights = sqliteTable("insights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Tipe: harian | mingguan | korelasi | tanya */
  type: text("type").notNull().default("harian"),
  title: text("title").notNull(),
  /** Isi insight */
  content: text("content").notNull(),
  /** Status feedback: baru | dilakukan | diabaikan */
  status: text("status").notNull().default("baru"),
  /** Sumber fitur (opsional, untuk filter) */
  source: text("source").default(""),
  date: text("date").notNull().default(sql`(date('now'))`),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Bad Habit Tracker ═══════════ */

export const badHabits = sqliteTable("bad_habits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Nama kebiasaan buruk (mis. "Scrolling sosmed") */
  name: text("name").notNull(),
  /** Kategori: digital | konsumsi | fisik | lainnya */
  category: text("category").notNull().default("digital"),
  /** Target pengurangan (teks bebas) */
  targetText: text("target_text").default(""),
  /** Alasan ingin berhenti — diingatkan AI saat lemah */
  alasan: text("alasan").default(""),
  /** Target kambuh maksimal per minggu (untuk progres bertahap) */
  weeklyTarget: integer("weekly_target").default(0),
  /** Aktif / diarsipkan */
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  /** Hasil analisa AI terakhir (JSON) — disimpan agar tidak di-generate ulang */
  lastAnalysis: text("last_analysis").default(""),
  /** Source analisa terakhir: ai | heuristik */
  lastAnalysisSource: text("last_analysis_source").default(""),
  /** Waktu analisa terakhir (ISO) */
  lastAnalyzedAt: text("last_analyzed_at").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const habitLogs = sqliteTable("habit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  habitId: integer("habit_id")
    .notNull()
    .references(() => badHabits.id, { onDelete: "cascade" }),
  /** Tanggal check-in (YYYY-MM-DD) — upsert per habit+tanggal */
  date: text("date").notNull(),
  /** bersih = tidak kambuh, kambuh = terulang */
  status: text("status", { enum: ["bersih", "kambuh"] }).notNull(),
  /** Berapa kali kambuh di hari itu (jika kambuh) */
  jumlahKambuh: integer("jumlah_kambuh").notNull().default(1),
  /** Catatan pemicu (opsional) */
  catatan: text("catatan").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Resep Makanan (Food — AI generate gizi) ═══════════ */

export const foodRecipes = sqliteTable("food_recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Judul resep */
  title: text("title").notNull(),
  /** Permintaan awal user (prompt) */
  request: text("request").default(""),
  /** Hasil resep dari AI (JSON: bahan, langkah, gizi, vitamin, manfaat) */
  recipe: text("recipe").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

/* ═══════════ Program Latihan (Exercise — AI training program) ═══════════ */

export const exercisePrograms = sqliteTable("exercise_programs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Tujuan user (mis. "Saya ingin memperbesar lengan saya") */
  goal: text("goal").notNull(),
  /** Hasil program dari AI (JSON: makanan, olahraga, gerakan, diet, istirahat) */
  program: text("program").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

/* ═══════════ Carousel Instagram (AI generate + canvas) ═══════════ */

export const carousels = sqliteTable("carousels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Topik carousel */
  topic: text("topic").notNull(),
  /** Jumlah slide */
  slideCount: integer("slide_count").notNull().default(5),
  /** Tema warna (teal/emas/lavender/gelap/terang) */
  theme: text("theme").notNull().default("teal"),
  /** Sumber background (gambar/ai/gradient) */
  bgSource: text("bg_source").notNull().default("ai"),
  /** Gaya konten (ringkas/informatif) */
  contentStyle: text("content_style").notNull().default("ringkas"),
  /** Hasil AI (JSON: slides[{heading, points, emoji}], caption, hashtags, bgSpec) */
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

/** Branding carousel (1 baris) — header/footer slide. */
export const carouselSettings = sqliteTable("carousel_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Nama brand/akun */
  brandName: text("brand_name").default("LifeOS"),
  /** Handle Instagram */
  handle: text("handle").default("@lifeos"),
  /** Tagline singkat */
  tagline: text("tagline").default(""),
  /** Inisial logo (avatar lingkaran di canvas) */
  initials: text("initials").default("L"),
  /** Tampilkan branding di header/footer */
  showBranding: integer("show_branding", { mode: "boolean" }).notNull().default(true),
});

/* ═══════════ Content Creation — TikTok Affiliate (Ide/Naskah/Tracker) ═══════════ */

/** Ide konten video (bank ide + status pipeline). */
export const contentIdeas = sqliteTable("content_ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Topik/produk yang diminta */
  topic: text("topic").notNull(),
  /** Format konten (review/tips/unboxing/dll) */
  format: text("format").default("review"),
  /** Hasil AI (JSON: ideas[{hook, hookLine}]) */
  ideas: text("ideas").notNull(),
  /** Status pipeline: ide/riset/produksi/posting */
  status: text("status").notNull().default("ide"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

/** Naskah video (skrip hook→bridge→CTA + caption + hashtag). */
export const contentScripts = sqliteTable("content_scripts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Topik naskah */
  topic: text("topic").notNull(),
  /** Relasi ke ide (opsional) */
  ideaId: integer("idea_id"),
  /** Durasi (30/45/60 detik) */
  duration: integer("duration").notNull().default(45),
  /** Hasil AI (JSON: skrip[{bagian, teks}], caption, hashtags) */
  script: text("script").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

/** Produk affiliate tracker (pipeline + performa). */
export const affiliateProducts = sqliteTable("affiliate_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Nama produk */
  product: text("product").notNull(),
  /** Marketplace: tiktok-shop/shopee/tokopedia/lainnya */
  marketplace: text("marketplace").notNull().default("tiktok-shop"),
  /** Link affiliate */
  link: text("link").default(""),
  /** Harga produk */
  price: integer("price").notNull().default(0),
  /** Estimasi komisi % (dari AI atau manual) */
  commissionPct: integer("commission_pct").notNull().default(5),
  /** Analisa AI (JSON: audiens, angle, estimasiKomisi) */
  analysis: text("analysis").default(""),
  /** Relasi ke ide/naskah (opsional) */
  ideaId: integer("idea_id"),
  scriptId: integer("script_id"),
  /** Status pipeline: riset/dipromosikan/komisi */
  status: text("status").notNull().default("riset"),
  /** Performa (manual) */
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  /** Komisi diterima (Rp) */
  commissionReceived: integer("commission_received").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

/* ═══════════ Insight Cache (hasil analisa AI — persist SQLite) ═══════════ */

export const insightCache = sqliteTable("insight_cache", {
  /** Key unik per route + tanggal (mis. "finance:2026-08-01") */
  key: text("key").primaryKey(),
  /** Hasil analisa (JSON string) */
  value: text("value").notNull(),
  /** Waktu dibuat (UTC) — TTL 15 menit diverifikasi di kode */
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

/* ═══════════ Quotes Harian (dashboard slider) ═══════════ */

export const dailyQuotes = sqliteTable("daily_quotes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Tanggal quote (YYYY-MM-DD) — semua quote hari itu tampil di slider */
  date: text("date").notNull(),
  /** Isi quote */
  content: text("content").notNull(),
  /** Pengarang/sumber (default "AI LifeOS") */
  author: text("author").default(""),
  /** Topik (motivasi, disiplin, keluarga, dll.) */
  topic: text("topic").default(""),
  /** Urutan dalam slider hari itu */
  position: integer("position").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Quote Topics (topik quotes yang bisa di-manage) ═══════════ */

export const quoteTopics = sqliteTable("quote_topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Nama topik (unik, lowercase) */
  name: text("name").notNull().unique(),
  /** Personality AI untuk topik ini: bijak/tegas/lembut/motivator/spiritual */
  personality: text("personality").notNull().default("bijak"),
  /** Deskripsi singkat topik */
  description: text("description").default(""),
  /** Aktif (muncul di dropdown generate) */
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Pomodoro Technique ═══════════ */

export const pomodoroSessions = sqliteTable("pomodoro_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Tanggal sesi (YYYY-MM-DD) */
  date: text("date").notNull(),
  /** Durasi fokus sesi ini (menit) */
  durationMinutes: integer("duration_minutes").notNull().default(25),
  /** Siklus ke berapa hari itu (1,2,3…) */
  cycle: integer("cycle").notNull().default(1),
  /** Label tugas/konteks (opsional) */
  task: text("task").default(""),
  /** Selesai penuh atau di-skip */
  completed: integer("completed", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Financial Planning (FIRE, dana sekolah, darurat) ═══════════ */

export const financialPlans = sqliteTable("financial_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Pemasukan bulanan (Rp) */
  monthlyIncome: integer("monthly_income").notNull().default(0),
  /** Pengeluaran bulanan (Rp) */
  monthlyExpense: integer("monthly_expense").notNull().default(0),
  /** Tabungan/investasi per bulan (Rp) */
  monthlySavings: integer("monthly_savings").notNull().default(0),
  /** Target tabungan darurat (x pengeluaran bulanan) — default 6 */
  emergencyMonths: integer("emergency_months").notNull().default(6),
  /** Dana darurat yang sudah terkumpul (Rp) */
  emergencyCurrent: integer("emergency_current").notNull().default(0),
  /** Alokasi investasi saham (%) */
  stockPct: integer("stock_pct").notNull().default(60),
  /** Alokasi obligasi (%) */
  bondPct: integer("bond_pct").notNull().default(30),
  /** Alokasi deposito/emas/kas (%) */
  cashPct: integer("cash_pct").notNull().default(10),
  /** Return tahunan saham (%) — default 12 */
  stockReturn: integer("stock_return").notNull().default(12),
  /** Return tahunan obligasi (%) — default 6 */
  bondReturn: integer("bond_return").notNull().default(6),
  /** Return tahunan deposito/kas (%) — default 4 */
  cashReturn: integer("cash_return").notNull().default(4),
  /** Inflasi tahunan (%) — default 4 */
  inflation: integer("inflation").notNull().default(4),
  /** Pengali target FIRE (x pengeluaran tahunan) — default 25 */
  fireMultiple: integer("fire_multiple").notNull().default(25),
  /** Jumlah anak */
  childrenCount: integer("children_count").notNull().default(0),
  /** Usia anak tertua (tahun) */
  childAge: integer("child_age").notNull().default(0),
  /** Jenjang pendidikan target: sd/smp/sma/kuliah */
  schoolLevel: text("school_level").notNull().default("kuliah"),
  /** Biaya per tahun sekarang (Rp) */
  schoolCostYear: integer("school_cost_year").notNull().default(0),
  /** Inflasi pendidikan (%) — default 10 */
  schoolInflation: integer("school_inflation").notNull().default(10),
  /** Usia sekarang (fallback bila life_profile tidak terisi) */
  age: integer("age").notNull().default(0),
  /** Target dividen per tahun (Rp) */
  dividendTarget: integer("dividend_target").notNull().default(0),
  /** Yield dividen rata-rata (%) — default 5 */
  dividendYield: integer("dividend_yield").notNull().default(5),
  /** Hasil analisa AI (JSON) — tersimpan untuk ditampilkan ulang */
  analysis: text("analysis").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

/* ═══════════ Financial Children (anak — dana pendidikan multiple) ═══════════ */

export const financialChildren = sqliteTable("financial_children", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Nama anak */
  name: text("name").notNull(),
  /** Usia anak (tahun) */
  age: integer("age").notNull().default(0),
  /** Jenjang target: sd/smp/sma/kuliah */
  schoolLevel: text("school_level").notNull().default("kuliah"),
  /** Biaya per tahun sekarang (Rp) */
  schoolCostYear: integer("school_cost_year").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

/* ═══════════ Financial Chats (riwayat percakapan dengan AI advisor) ═══════════ */

export const financialChats = sqliteTable("financial_chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Peran: user | assistant */
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  /** Isi pesan */
  message: text("message").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Life Profile (biodata hidup — akar Story of My Life) ═══════════ */

export const lifeProfiles = sqliteTable("life_profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Tanggal lahir (YYYY-MM-DD) — menentukan usia sekarang & stage timeline */
  birthDate: text("birth_date").default(""),
  /** Nilai-nilai yang dipedulikan */
  values: text("values").default(""),
  /** Luka masa kecil */
  childhoodWounds: text("childhood_wounds").default(""),
  /** Pola asuh orang tua */
  parenting: text("parenting").default(""),
  /** Siapa orang tua / keluarga inti */
  family: text("family").default(""),
  /** Catatan hidup lain */
  lifeNotes: text("life_notes").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

/* ═══════════ Life Chats (riwayat AI curhat per stage usia) ═══════════ */

export const lifeChats = sqliteTable("life_chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Stage usia chat ini */
  age: integer("age").notNull().default(1),
  /** Peran: user | assistant */
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  /** Isi pesan */
  content: text("content").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Life Stories (Story of My Life — stage umur) ═══════════ */

export const lifeStories = sqliteTable("life_stories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Usia saat cerita terjadi (1–N) */
  age: integer("age").notNull().default(1),
  /** Judul cerita */
  title: text("title").notNull().default(""),
  /** Kategori: percintaan | konflik | keluarga | karier | pendidikan | pertemanan | kesehatan | lainnya */
  category: text("category").notNull().default("lainnya"),
  /** Aktor terlibat (nama, dipisah koma) */
  actors: text("actors").default(""),
  /** Isi cerita */
  story: text("story").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

/* ═══════════ Hutang & Piutang (debt management) ═══════════ */

export const debts = sqliteTable("debts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Arah: hutang (kita berutang) | piutang (orang berutang ke kita) */
  type: text("type", { enum: ["hutang", "piutang"] }).notNull().default("hutang"),
  /** Nama pihak (orang/lembaga) */
  party: text("party").notNull(),
  /** Total nominal (Rp) */
  amount: integer("amount").notNull().default(0),
  /** Mode pembayaran: sekali (1x bayar) | cicilan */
  paymentMode: text("payment_mode", { enum: ["sekali", "cicilan"] }).notNull().default("sekali"),
  /** Total cicilan (mode cicilan) */
  installmentCount: integer("installment_count").notNull().default(1),
  /** Cicilan yang sudah dibayar (mode cicilan) */
  installmentsPaid: integer("installments_paid").notNull().default(0),
  /** Nominal yang sudah dibayar/diterima (Rp) */
  paidAmount: integer("paid_amount").notNull().default(0),
  /** Tanggal mulai / tanggal transaksi */
  date: text("date").notNull().default(sql`(date('now'))`),
  /** Jatuh tempo (opsional) */
  dueDate: text("due_date").default(""),
  /** Bunga tahunan (%) — 0 = tanpa bunga (anti riba) */
  interestRate: integer("interest_rate").notNull().default(0),
  /** Angsuran per bulan (Rp) — mode cicilan */
  monthlyInstallment: integer("monthly_installment").notNull().default(0),
  /** Status: belum | sebagian | lunas (dihitung dari paidAmount) */
  status: text("status", { enum: ["belum", "sebagian", "lunas"] }).notNull().default("belum"),
  /** Catatan */
  notes: text("notes").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

/* ═══════════ Stock Portfolio (posisi saham dimiliki) ═══════════ */

export const stockPortfolio = sqliteTable("stock_portfolio", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Kode saham (ticker, uppercase) */
  code: text("code").notNull(),
  /** Jumlah lot dimiliki */
  lot: integer("lot").notNull().default(0),
  /** Harga beli rata-rata per lembar */
  buyPrice: integer("buy_price").notNull().default(0),
  /** Harga pasar sekarang (diisi manual user, opsional) */
  marketPrice: integer("market_price").default(0),
  /** Tanggal beli */
  buyDate: text("buy_date").default(""),
  /** Catatan */
  notes: text("notes").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

/* ═══════════ Stock Plans (rencana avg down / right issue tersimpan) ═══════════ */

export const stockPlans = sqliteTable("stock_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Kode saham (ticker, uppercase) — mis. BBRI */
  code: text("code").notNull(),
  /** Jenis rencana: avgdown | rightissue | lotfee */
  type: text("type", { enum: ["avgdown", "rightissue", "lotfee"] }).notNull(),
  /** Input kalkulasi (JSON string) */
  inputJson: text("input_json").notNull(),
  /** Hasil kalkulasi snapshot (JSON string) */
  resultJson: text("result_json").notNull(),
  /** Catatan opsional */
  notes: text("notes").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

/* ═══════════ Insight Feedback (AI belajar) ═══════════ */

export const insightFeedback = sqliteTable("insight_feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(), // fitur asal insight
  insightText: text("insight_text").notNull(),
  action: text("action", { enum: ["dilakukan", "diabaikan"] }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/* ═══════════ Vector (Extended Memory AI) ═══════════
 * Disimpan sebagai BLOB JSON — diproses oleh lib/ai/memory.ts.
 * (sqlite-vec native bisa ditambahkan belakangan tanpa ubah schema ini)
 */

export const embeddings = sqliteTable("embeddings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceTable: text("source_table").notNull(), // "knowledge" | "todo" | ...
  sourceId: integer("source_id").notNull(),
  model: text("model").notNull(),
  chunkIndex: integer("chunk_index").notNull().default(0),
  chunkText: text("chunk_text").notNull(),
  vector: text("vector").notNull(), // JSON array angka
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Knowledge = typeof knowledge.$inferSelect;
export type Todo = typeof todos.$inferSelect;
export type Embedding = typeof embeddings.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type FinanceCategory = typeof financeCategories.$inferSelect;
export type FinanceTransaction = typeof financeTransactions.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type ActivityCategory = typeof activityCategories.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type TimeBlock = typeof timeBlocks.$inferSelect;
export type HealthEntry = typeof healthEntries.$inferSelect;
export type HealthGoal = typeof healthGoals.$inferSelect;
export type MoodEntry = typeof moodEntries.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type SickEntry = typeof sickEntries.$inferSelect;
export type FamilyEntry = typeof familyEntries.$inferSelect;
export type SpiritualEntry = typeof spiritualEntries.$inferSelect;
export type SpiritualGoal = typeof spiritualGoals.$inferSelect;
export type BusinessIdea = typeof businessIdeas.$inferSelect;
export type BusinessProject = typeof businessProjects.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type TeamOneOnOne = typeof teamOneOnOnes.$inferSelect;
export type TeamFeedback = typeof teamFeedback.$inferSelect;
export type Insight = typeof insights.$inferSelect;
export type BadHabit = typeof badHabits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
export type DailyQuote = typeof dailyQuotes.$inferSelect;
export type PomodoroSession = typeof pomodoroSessions.$inferSelect;
export type FinancialPlan = typeof financialPlans.$inferSelect;
export type StockPlan = typeof stockPlans.$inferSelect;
export type StockPosition = typeof stockPortfolio.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type LifeStory = typeof lifeStories.$inferSelect;
export type LifeProfile = typeof lifeProfiles.$inferSelect;
export type LifeChat = typeof lifeChats.$inferSelect;