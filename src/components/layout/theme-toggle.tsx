"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// true setelah mount (client), false saat SSR — tanpa effect/setState,
// jadi aman dari hydration mismatch & lolos react-hooks lint.
function useMounted(): boolean {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

/**
 * Toggle tema — dua mode:
 * - "full"  (default): tombol lebar berlabel, untuk sidebar footer
 * - "icon"  : tombol ikon kecil, untuk header
 *
 * ⚠️ Hydration-safe: ikon hanya dirender setelah mount (client),
 * karena theme tidak diketahui saat SSR → mencegah hydration mismatch.
 */
export function ThemeToggle({ variant = "full" }: { variant?: "full" | "icon" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const dark = mounted && resolvedTheme === "dark";
  const Icon = dark ? Sun : Moon;
  const label = dark ? "Mode terang" : "Mode gelap";

  return (
    <Button
      variant="ghost"
      size={variant === "icon" ? "icon" : "sm"}
      className={cn(
        variant === "full" && "w-full justify-start gap-2 text-muted-foreground"
      )}
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label="Ganti tema"
    >
      {mounted ? (
        <Icon className="size-4" />
      ) : (
        <span className="size-4" aria-hidden="true" />
      )}
      {variant === "full" && mounted && label}
    </Button>
  );
}
