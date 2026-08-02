"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navGroups } from "@/lib/navigation";
import { Sparkles, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground animate-in fade-in slide-in-from-left-4 [animation-duration:300ms] md:flex">
      {/* Logo — tinggi sama dengan header (h-16), border bottom sejajar */}
      <Link
        href="/"
        className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-5 font-semibold"
      >
        <Sparkles className="size-5 text-primary" />
        <span className="text-lg tracking-tight">LifeOS</span>
      </Link>

      {/* Navigasi */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mt-5">
            <p className="px-3 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.description}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-1.5 border-t border-border p-3">
        <ThemeToggle />
        <button
          onClick={async () => {
            try {
              await fetch("/api/auth/logout", { method: "POST" });
            } catch {
              // tetap redirect walau gagal
            }
            window.location.href = "/login";
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4 shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
