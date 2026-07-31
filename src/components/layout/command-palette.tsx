"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAllNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Context agar trigger & dialog berbagi state open */
const PaletteContext = React.createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function useCommandPalette() {
  return React.useContext(PaletteContext);
}

/** Dialog command palette global — dipasang di layout root, MEMBUNGKUS children
 *  agar trigger di mana pun (header, halaman) bisa membukanya via context. */
export function CommandPalette({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const items = getAllNavItems();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <PaletteContext.Provider value={{ open, setOpen }}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Cari di LifeOS</DialogTitle>
          <CommandPrimitive className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
            <CommandPrimitive.Input
              placeholder="Cari fitur atau ketik perintah…"
              className="flex h-12 w-full rounded-none border-0 border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
            />
            <CommandPrimitive.List className="max-h-72 overflow-y-auto p-1">
              <CommandPrimitive.Empty className="py-6 text-center text-sm text-muted-foreground">
                Tidak ditemukan.
              </CommandPrimitive.Empty>
              <CommandPrimitive.Group heading="Fitur">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandPrimitive.Item
                      key={item.href}
                      value={`${item.title} ${item.description}`}
                      onSelect={() => {
                        router.push(item.href);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm",
                        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                      )}
                    >
                      <Icon className="size-4 text-primary" />
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
                    </CommandPrimitive.Item>
                  );
                })}
              </CommandPrimitive.Group>
            </CommandPrimitive.List>
          </CommandPrimitive>
        </DialogContent>
      </Dialog>
      {children}
    </PaletteContext.Provider>
  );
}

/** Tombol pencarian — dipakai di header */
export function CommandPaletteTrigger() {
  const { setOpen } = useCommandPalette();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      aria-label="Cari (⌘K)"
    >
      <Search className="size-4 shrink-0" />
      <span className="flex-1 text-left">Cari di LifeOS…</span>
      <kbd className="hidden items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:flex">
        ⌘K
      </kbd>
    </button>
  );
}
