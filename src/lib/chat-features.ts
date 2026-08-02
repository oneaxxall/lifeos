import {
  BookHeart,
  Calculator,
  CheckSquare,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  Library,
  MessageSquareText,
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

export function getFeatureMeta(feature: string) {
  return CHAT_FEATURES.find((f) => f.key === feature) ?? CHAT_FEATURES[0];
}
