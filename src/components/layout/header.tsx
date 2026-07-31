"use client";

import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CommandPaletteTrigger } from "@/components/layout/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/**
 * Header global — hamburger (mobile) + search (⌘K) + tanggal di kanan + bell + toggle tema.
 * Sesuai design system: elemen global top bar.
 */
export function Header() {
  const today = format(new Date(), "EEEE, d MMMM yyyy", { locale: id });

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur md:gap-4 md:px-6">
      {/* Hamburger — hanya mobile */}
      <MobileNav />

      {/* Search — trigger command palette */}
      <div className="min-w-0 max-w-md flex-1">
        <CommandPaletteTrigger />
      </div>

      {/* Kanan: tanggal · bell · tema (ikon) */}
      <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
        <span className="hidden text-sm capitalize text-muted-foreground xl:block">
          {today}
        </span>
        <NotificationBell />
        <ThemeToggle variant="icon" />
      </div>
    </header>
  );
}
