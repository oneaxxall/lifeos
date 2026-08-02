import {
  ArrowLeftRight,
  BookHeart,
  Brain,
  Briefcase,
  Calculator,
  CheckSquare,
  Clapperboard,
  Clock,
  DatabaseBackup,
  Dumbbell,
  Flame,
  Handshake,
  HeartPulse,
  Home,
  Images,
  Library,
  MessageSquareText,
  Moon,
  NotebookPen,
  Quote,
  Sparkles,
  Stethoscope,
  Timer,
  TrendingUp,
  Users,
  UsersRound,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Navigasi 12 fitur LifeOS — sesuai design system (mapping ikon lucide) */
export const navGroups: NavGroup[] = [
  {
    label: "Inti",
    items: [
      { title: "Beranda", href: "/", icon: Home, description: "Dashboard & insight AI" },
      { title: "LifeOS Chat", href: "/chat", icon: MessageSquareText, description: "Chat AI konteks per fitur" },
      { title: "Knowledge", href: "/knowledge", icon: Library, description: "Second brain & memori AI" },
      { title: "Insights", href: "/insights", icon: Sparkles, description: "Hub AI lintas fitur" },
      { title: "Quotes", href: "/quotes", icon: Quote, description: "Koleksi & riwayat quote harian" },
    ],
  },
  {
    label: "Keuangan",
    items: [
      { title: "Finance", href: "/finance", icon: Wallet, description: "Keuangan & analisa AI" },
      { title: "Financial Planning", href: "/financial-planning", icon: Calculator, description: "FIRE, dana sekolah & darurat" },
      { title: "Stocks", href: "/stocks", icon: TrendingUp, description: "Portofolio & kalkulator saham" },
      { title: "Hutang & Piutang", href: "/debts", icon: ArrowLeftRight, description: "Utang-piutang & cicilan" },
    ],
  },
  {
    label: "Produktivitas",
    items: [
      { title: "Todo", href: "/todo", icon: CheckSquare, description: "Tugas & prioritas AI" },
      { title: "Time", href: "/time", icon: Clock, description: "Time blocking & timer" },
      { title: "Activity", href: "/activity", icon: NotebookPen, description: "Catat aktivitas harian" },
      { title: "Pomodoro", href: "/pomodoro", icon: Timer, description: "Teknik fokus 25/5" },
    ],
  },
  {
    label: "Kesehatan",
    items: [
      { title: "Health", href: "/health", icon: HeartPulse, description: "Kesehatan fisik" },
      { title: "Mental", href: "/mental", icon: Brain, description: "Kesehatan mental" },
      { title: "Food", href: "/food", icon: Utensils, description: "Resep & gizi dari AI" },
      { title: "Exercise", href: "/exercise", icon: Dumbbell, description: "Training program AI" },
      { title: "Sick", href: "/sick", icon: Stethoscope, description: "Catatan tidak enak badan" },
      { title: "Bad Habit", href: "/habits", icon: Flame, description: "Kurangi kebiasaan buruk" },
    ],
  },
  {
    label: "Kehidupan",
    items: [
      { title: "Life Story", href: "/stories", icon: BookHeart, description: "Kisah hidup per usia & AI curhat" },
      { title: "Family", href: "/family", icon: Users, description: "Keluarga" },
      { title: "Spiritual", href: "/spiritual", icon: Moon, description: "Ritual & refleksi" },
      { title: "Business", href: "/business", icon: Briefcase, description: "Bisnis & ide" },
      { title: "Networking", href: "/networking", icon: Handshake, description: "Relasi profesional" },
      { title: "Team", href: "/team", icon: UsersRound, description: "Manajemen tim" },
    ],
  },
  {
    label: "Karya",
    items: [
      { title: "Carousel", href: "/carousel", icon: Images, description: "Generator carousel Instagram AI" },
      { title: "Content", href: "/content", icon: Clapperboard, description: "TikTok affiliate: ide, naskah & tracker" },
    ],
  },
  {
    label: "Sistem",
    items: [
      { title: "Backup", href: "/backup", icon: DatabaseBackup, description: "Backup & restore data" },
    ],
  },
];

export function getAllNavItems(): NavItem[] {
  return navGroups.flatMap((g) => g.items);
}
