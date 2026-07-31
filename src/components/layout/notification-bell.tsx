"use client";

import { Bell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Bell notifikasi — menampilkan insight/pengingat AI.
 * v1: data statis contoh; nanti diisi dari insight AI (Fase 5).
 */
export function NotificationBell() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifikasi"
        >
          <Bell className="size-5" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary" />
          Notifikasi & Insight
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
          <span className="text-sm font-medium">Belum ada notifikasi</span>
          <span className="text-xs text-muted-foreground">
            Insight AI dari Knowledge, Todo, Finance, dan lainnya akan muncul
            di sini.
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
