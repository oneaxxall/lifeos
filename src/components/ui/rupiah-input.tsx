"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Tampilkan prefiks "Rp" di dalam input */
  prefix?: boolean;
  /** Mode seamless — tanpa border/background/focus ring (untuk inline edit di list) */
  ghost?: boolean;
}

/** Input angka rupiah — ketik angka, otomatis format titik ribuan (1.500.000).
 *  Value tetap angka murni; format hanya untuk tampilan. */
export function RupiahInput({ value, onChange, placeholder, className, disabled, prefix, ghost }: Props) {
  const display = value > 0 ? value.toLocaleString("id-ID") : "";
  return (
    <div className={cn("relative", ghost && "contents")}>
      {prefix && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          Rp
        </span>
      )}
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        placeholder={placeholder ?? "0"}
        disabled={disabled}
        onChange={(e) => {
          // Ambil hanya digit, buang titik/spasi → simpan sebagai angka murni
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits ? Number(digits) : 0);
        }}
        className={cn(
          "h-8 text-sm",
          prefix && "pl-9",
          ghost &&
            "block h-auto w-full min-w-0 rounded-none !border-0 !bg-transparent p-0 text-right text-[10px] leading-tight text-foreground !shadow-none !outline-none focus-visible:!border-0 focus-visible:!bg-transparent focus-visible:!shadow-none focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none dark:!bg-transparent dark:focus-visible:!bg-transparent",
          className
        )}
      />
    </div>
  );
}
