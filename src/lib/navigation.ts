import {
  ArrowLeftRight,
  Brain,
  Briefcase,
  Calculator,
  CheckSquare,
  Clock,
  DatabaseBackup,
  Flame,
  Handshake,
  HeartPulse,
  Home,
  Library,
  Moon,
  NotebookPen,
  Sparkles,
  Stethoscope,
  Timer,
  TrendingUp,
  Users,
  UsersRound,
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
      { title: "Knowledge", href: "/knowledge", icon: Library, description: "Second brain & memori AI" },
      { title: "Insights", href: "/insights", icon: Sparkles, description: "Hub AI lintas fitur" },
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
      { title: "Sick", href: "/sick", icon: Stethoscope, description: "Catatan tidak enak badan" },
      { title: "Bad Habit", href: "/habits", icon: Flame, description: "Kurangi kebiasaan buruk" },
    ],
  },
  {
    label: "Kehidupan",
    items: [
      { title: "Family", href: "/family", icon: Users, description: "Keluarga" },
      { title: "Spiritual", href: "/spiritual", icon: Moon, description: "Ritual & refleksi" },
      { title: "Business", href: "/business", icon: Briefcase, description: "Bisnis & ide" },
      { title: "Networking", href: "/networking", icon: Handshake, description: "Relasi profesional" },
      { title: "Team", href: "/team", icon: UsersRound, description: "Manajemen tim" },
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
