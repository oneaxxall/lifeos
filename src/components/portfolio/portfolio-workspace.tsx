"use client";

import * as React from "react";
import { Gem, Landmark, PieChart, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockPortfolio } from "@/components/stocks/stock-portfolio";
import { BondsWorkspace } from "@/components/portfolio/bonds-workspace";
import { MutualFundsWorkspace } from "@/components/portfolio/mutual-funds-workspace";
import { GoldWorkspace } from "@/components/portfolio/gold-workspace";

const TABS = [
  { id: "stocks", label: "Stocks", desc: "Portofolio saham & P/L", icon: TrendingUp },
  { id: "bonds", label: "Obligasi", desc: "SBN, FR, sukuk & kupon", icon: Landmark },
  { id: "mutual-funds", label: "Reksa Dana", desc: "NAV, unit & P/L", icon: PieChart },
  { id: "gold", label: "Emas", desc: "Gram, modal & nilai", icon: Gem },
] as const;

/** Portofolio — seluruh aset investasi dalam satu halaman (Stocks, Obligasi, Reksa Dana, Emas). */
export function PortfolioWorkspace() {
  return (
    <div className="space-y-5">
      {/* Header halaman */}
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <PieChart className="size-5 text-primary" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">Portofolio</h1>
          <p className="text-sm text-muted-foreground">Seluruh aset investasimu dalam satu tempat.</p>
        </div>
      </div>

      <Tabs defaultValue="stocks" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
              <t.icon className="size-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="stocks" className="mt-0">
          <StockPortfolio />
        </TabsContent>
        <TabsContent value="bonds" className="mt-0">
          <BondsWorkspace />
        </TabsContent>
        <TabsContent value="mutual-funds" className="mt-0">
          <MutualFundsWorkspace />
        </TabsContent>
        <TabsContent value="gold" className="mt-0">
          <GoldWorkspace />
        </TabsContent>
      </Tabs>
    </div>
  );
}
