"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { navGroups } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Navigasi mobile — hamburger di header membuka Sheet berisi menu (md: hidden). */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Buka menu"
          className="md:hidden"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Menu LifeOS</SheetTitle>

        {/* Logo */}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-5 font-semibold"
        >
          <Sparkles className="size-5 text-primary" />
          <span className="text-lg tracking-tight">LifeOS</span>
        </Link>

        {/* Navigasi */}
        <nav className="h-[calc(100%-8rem)] overflow-y-auto px-3 pb-4">
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
                        onClick={() => setOpen(false)}
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
        <div className="border-t border-border p-3">
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}
