"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckSquare, RefreshCw, Sparkles, Target, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AppNotification {
  key: string;
  type: "todo" | "debt" | "subscription" | "budget";
  title: string;
  message: string;
  href: string;
  date: string;
}

const TYPE_ICON = {
  todo: CheckSquare,
  debt: Wallet,
  subscription: RefreshCw,
  budget: Target,
} as const;

const TYPE_COLOR = {
  todo: "text-primary",
  debt: "text-amber-600 dark:text-amber-400",
  subscription: "text-violet-600 dark:text-violet-400",
  budget: "text-rose-600 dark:text-rose-400",
} as const;

const READ_KEY = "lifeos-notif-read";

const relLabel = (date: string) => {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  const today = new Date();
  const diff = Math.round((d.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  if (diff < 0) return `${-diff} hari lalu`;
  return `${diff} hari lagi`;
};

/** Bell notifikasi — pengingat pintar dari data LifeOS (todo, cicilan, langganan, budget). */
export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [readKeys, setReadKeys] = React.useState<string[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const j = await fetch("/api/notifications").then((r) => r.json());
        if (!cancelled) setItems(j.data ?? []);
      } catch {
        // abaikan
      }
      try {
        const saved = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
        if (!cancelled && Array.isArray(saved)) setReadKeys(saved);
      } catch {
        // abaikan
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const unread = items.filter((n) => !readKeys.includes(n.key));

  const markRead = (key: string) => {
    setReadKeys((prev) => {
      const next = prev.includes(key) ? prev : [...prev, key];
      try {
        localStorage.setItem(READ_KEY, JSON.stringify(next));
      } catch {
        // abaikan
      }
      return next;
    });
  };

  const markAllRead = () => {
    setReadKeys(items.map((n) => n.key));
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(items.map((n) => n.key)));
    } catch {
      // abaikan
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifikasi">
          <Bell className="size-5" />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary" />
          Notifikasi & Pengingat
          {unread.length > 0 && (
            <span className="ml-auto rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
              {unread.length} baru
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="text-sm font-medium">Semua beres</span>
              <span className="text-xs text-muted-foreground">
                Tidak ada pengingat — todo, cicilan, langganan & budget aman.
              </span>
            </DropdownMenuItem>
          ) : (
            items.map((n) => {
              const Icon = TYPE_ICON[n.type];
              const isRead = readKeys.includes(n.key);
              return (
                <DropdownMenuItem
                  key={n.key}
                  className="flex cursor-pointer items-start gap-2.5 py-2.5"
                  onClick={() => {
                    markRead(n.key);
                    router.push(n.href);
                  }}
                >
                  <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/60", TYPE_COLOR[n.type])}>
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">{n.title}</span>
                      {!isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{n.message}</span>
                    <span className="mt-0.5 block text-[9px] text-muted-foreground/70">{relLabel(n.date)}</span>
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        {items.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer justify-center text-[11px] text-muted-foreground hover:text-foreground"
              onClick={markAllRead}
            >
              Tandai semua dibaca
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
