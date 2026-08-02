import {
  BookHeart,
  Briefcase,
  Calculator,
  CheckSquare,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  Library,
  MessageSquareText,
  Moon,
  Quote,
  Timer,
  TrendingUp,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Daftar konteks fitur LifeOS Chat — icon sama dengan sidebar (navigation.ts). */
export const CHAT_FEATURES: {
  key: string;
  label: string;
  desc: string;
  icon: LucideIcon;
}[] = [
  { key: "umum", label: "Umum", desc: "Chat bebas tanpa konteks data", icon: MessageSquareText },
  { key: "knowledge", label: "Knowledge", desc: "Second brain & catatan", icon: Library },
  { key: "todos", label: "Todos", desc: "Tugas & prioritas", icon: CheckSquare },
  { key: "finance", label: "Finance", desc: "Transaksi & analisa keuangan", icon: Wallet },
  { key: "financial-planning", label: "Financial Planning", desc: "Profil keuangan, cicilan & target", icon: Calculator },
  { key: "stocks", label: "Stocks", desc: "Portofolio saham", icon: TrendingUp },
  { key: "food", label: "Food", desc: "Resep & makanan", icon: Utensils },
  { key: "exercise", label: "Exercise", desc: "Program olahraga", icon: Dumbbell },
  { key: "health", label: "Health", desc: "Kesehatan & kebugaran", icon: HeartPulse },
  { key: "life-story", label: "Life Story", desc: "Profil hidup & cerita", icon: BookHeart },
  { key: "quotes", label: "Quotes", desc: "Koleksi quote harian", icon: Quote },
  { key: "activity", label: "Activity", desc: "Aktivitas & manajemen waktu", icon: Clock },
  { key: "pomodoro", label: "Pomodoro", desc: "Sesi fokus", icon: Timer },
  { key: "habits", label: "Habits", desc: "Kebiasaan & target", icon: Flame },
];

export type ChatFeatureKey = (typeof CHAT_FEATURES)[number]["key"];

/** Personality advisor — mode Advisor di LifeOS Chat. */
export const ADVISOR_TYPES: {
  key: string;
  label: string;
  desc: string;
  icon: LucideIcon;
}[] = [
  { key: "psikolog", label: "Psikolog", desc: "Empati, mendengarkan, kesehatan mental", icon: HeartPulse },
  { key: "business", label: "Business Advisor", desc: "Strategi bisnis, keputusan, pertumbuhan", icon: Briefcase },
  { key: "keuangan", label: "Keuangan", desc: "Perencanaan & analisa keuangan", icon: Wallet },
  { key: "karier", label: "Karier", desc: "Pengembangan karier & keputusan", icon: TrendingUp },
  { key: "spiritual", label: "Spiritual", desc: "Makna, syukur, ketenangan jiwa", icon: Moon },
  { key: "produktivitas", label: "Produktivitas", desc: "Fokus, waktu, kebiasaan", icon: Timer },
];

export function getAdvisorMeta(key: string) {
  return ADVISOR_TYPES.find((a) => a.key === key) ?? ADVISOR_TYPES[0];
}

export function getFeatureMeta(feature: string) {
  return CHAT_FEATURES.find((f) => f.key === feature) ?? CHAT_FEATURES[0];
}
