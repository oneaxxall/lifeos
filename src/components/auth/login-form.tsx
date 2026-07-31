"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckSquare,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Lock,
  Moon,
  Quote,
  Sparkles,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Slide {
  icon: LucideIcon;
  title: string;
  description: string;
  quote: string;
  author: string;
}

const SLIDES: Slide[] = [
  {
    icon: CheckSquare,
    title: "Todo yang terarah",
    description:
      "Kanban drag & drop dengan prioritas AI setiap hari — tahu mana yang harus dikerjakan duluan.",
    quote: "Disiplin adalah jembatan antara tujuan dan pencapaian.",
    author: "Jim Rohn",
  },
  {
    icon: Wallet,
    title: "Keuangan terkontrol",
    description:
      "Pantau pengeluaran, budget per kategori, dan langganan — lengkap dengan analisa pemborosan AI.",
    quote: "Kebebasan finansial dimulai dari kesadaran kecil hari ini.",
    author: "LifeOS",
  },
  {
    icon: HeartPulse,
    title: "Sehat fisik & mental",
    description:
      "Catat kesehatan, mood, dan keluhan — AI membantu melihat pola yang luput dari perhatian.",
    quote: "Jaga tubuhmu, itu satu-satunya tempat tinggalmu seumur hidup.",
    author: "LifeOS",
  },
  {
    icon: Sparkles,
    title: "AI personal assistant",
    description:
      "Brief harian, insight lintas fitur, dan tanya jawab natural tentang hidupmu — semua lokal & privat.",
    quote: "Teknologi terbaik adalah yang membuatmu lebih manusiawi.",
    author: "LifeOS",
  },
  {
    icon: Moon,
    title: "Spiritual, keluarga & relasi",
    description:
      "Ritual harian, curhatan keluarga, bisnis, hingga manajemen tim — satu portal untuk semua aspek hidup.",
    quote: "Keseimbangan hidup adalah kunci ketenangan sejati.",
    author: "LifeOS",
  },
];

/** Halaman login LifeOS — kredensial dari .env (tanpa database).
 *  Split-screen: kiri form login, kanan slider preview fitur + quotes (lg ke atas). */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);

  // Auto-rotate slider quotes
  React.useEffect(() => {
    const timer = setInterval(() => {
      setActive((a) => (a + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Username dan password wajib diisi");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Login berhasil, selamat datang!");
        router.push(next);
        router.refresh();
      } else {
        toast.error(json.error || "Login gagal");
      }
    } catch {
      toast.error("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ══ KIRI: FORM LOGIN ══ */}
      <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background p-4 sm:p-8">
        {/* dekorasi lembut */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative w-full max-w-sm">
          {/* Brand */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-500 shadow-lg shadow-primary/25">
              <Sparkles className="size-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">LifeOS</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Second brain & AI personal assistant
            </p>
          </div>

          {/* Card form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Selamat datang kembali 👋</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Masuk untuk melanjutkan perjalananmu.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    autoComplete="username"
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    className="pl-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Lock className="size-4" />
                )}
                {loading ? "Memverifikasi…" : "Masuk"}
              </Button>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Data Anda tersimpan lokal & privat. 🔒
          </p>
        </div>
      </div>

      {/* ══ KANAN: SLIDER PREVIEW FITUR + QUOTES (lg ke atas) ══ */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-teal-800 via-primary to-emerald-700 lg:block">
        {/* dekorasi */}
        <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-emerald-300/10 blur-3xl" />
        <Sparkles className="absolute right-10 top-10 size-6 text-white/30" />
        <Sparkles className="absolute bottom-16 left-12 size-4 text-white/20" />

        <div className="relative flex h-full flex-col justify-center px-10 py-16 xl:px-16">
          {/* Slide aktif */}
          <div className="relative min-h-[380px]">
            {SLIDES.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className={cn(
                    "absolute inset-0 flex flex-col justify-center transition-all duration-700",
                    i === active
                      ? "translate-x-0 opacity-100"
                      : "pointer-events-none translate-x-8 opacity-0"
                  )}
                >
                  {/* Preview fitur */}
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                      <Icon className="size-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white">{s.title}</p>
                      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/75">
                        {s.description}
                      </p>
                    </div>
                  </div>

                  {/* Quotes motivasi */}
                  <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md">
                    <Quote className="size-6 text-white/50" />
                    <p className="mt-3 font-literata text-2xl leading-relaxed text-white xl:text-3xl">
                      &ldquo;{s.quote}&rdquo;
                    </p>
                    <p className="mt-3 text-sm font-medium text-white/70">— {s.author}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dots navigasi */}
          <div className="mt-8 flex items-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={i}
                aria-label={`Lihat slide ${i + 1}`}
                onClick={() => setActive(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === active ? "w-8 bg-white" : "w-2.5 bg-white/35 hover:bg-white/60"
                )}
              />
            ))}
            <span className="ml-auto text-xs text-white/50">
              {String(active + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
