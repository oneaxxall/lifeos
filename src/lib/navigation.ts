import {
  Brain,
  Briefcase,
  CheckSquare,
  Clock,
  Handshake,
  HeartPulse,
  Home,
  Library,
  Moon,
  Sparkles,
  Stethoscope,
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
      { title: "Todo", href: "/todo", icon: CheckSquare, description: "Tugas & prioritas AI" },
      { title: "Time", href: "/time", icon: Clock, description: "Manajemen waktu" },
      { title: "Finance", href: "/finance", icon: Wallet, description: "Keuangan & analisa AI" },
      { title: "Insights", href: "/insights", icon: Sparkles, description: "Hub AI lintas fitur" },
    ],
  },
  {
    label: "Kesehatan",
    items: [
      { title: "Health", href: "/health", icon: HeartPulse, description: "Kesehatan fisik" },
      { title: "Mental", href: "/mental", icon: Brain, description: "Kesehatan mental" },
      { title: "Sick", href: "/sick", icon: Stethoscope, description: "Catatan tidak enak badan" },
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
];

export function getAllNavItems(): NavItem[] {
  return navGroups.flatMap((g) => g.items);
}
