"use client";

import * as React from "react";
import { toast } from "sonner";
import { TransactionForm } from "@/components/finance/transaction-form";
import { TransactionList, type TransactionItem } from "@/components/finance/transaction-list";
import { MonthlySummary, type MonthlySummaryData } from "@/components/finance/monthly-summary";
import { SubscriptionsPanel, type SubscriptionItem } from "@/components/finance/subscriptions-panel";
import { BudgetPanel, type BudgetItem } from "@/components/finance/budget-panel";
import { FinanceInsightPanel } from "@/components/finance/finance-insight-panel";
import type { FinanceCategory } from "@/lib/db/schema";

/** Orchestrator Finance — state, fetch, compose komponen.
 *  Single responsibility: hanya koordinasi. */
export function FinanceWorkspace() {
  const [categories, setCategories] = React.useState<FinanceCategory[]>([]);
  const [transactions, setTransactions] = React.useState<TransactionItem[]>([]);
  const [summary, setSummary] = React.useState<MonthlySummaryData | null>(null);
  const [subscriptions, setSubscriptions] = React.useState<SubscriptionItem[]>([]);
  const [monthlyTotal, setMonthlyTotal] = React.useState(0);
  const [budgets, setBudgets] = React.useState<BudgetItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const loadAll = React.useCallback(async () => {
    try {
      const [txRes, catRes, sumRes, subRes, budRes] = await Promise.all([
        fetch("/api/finance/transactions"),
        fetch("/api/finance/categories"),
        fetch("/api/finance/summary"),
        fetch("/api/finance/subscriptions"),
        fetch("/api/finance/budgets"),
      ]);
      const [txJson, catJson, sumJson, subJson, budJson] = await Promise.all([
        txRes.json(),
        catRes.json(),
        sumRes.json(),
        subRes.json(),
        budRes.json(),
      ]);
      setTransactions(txJson.data ?? []);
      setCategories(catJson.data ?? []);
      setSummary(sumJson.data ?? null);
      setSubscriptions(subJson.data ?? []);
      setMonthlyTotal(subJson.monthlyTotal ?? 0);
      setBudgets(budJson.data ?? []);
    } catch {
      toast.error("Gagal memuat data keuangan");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal — fetch langsung di effect (setState hanya setelah await)
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/finance/transactions"),
      fetch("/api/finance/categories"),
      fetch("/api/finance/summary"),
      fetch("/api/finance/subscriptions"),
      fetch("/api/finance/budgets"),
    ])
      .then(([txRes, catRes, sumRes, subRes, budRes]) =>
        Promise.all([txRes.json(), catRes.json(), sumRes.json(), subRes.json(), budRes.json()])
      )
      .then(([txJson, catJson, sumJson, subJson, budJson]) => {
        if (cancelled) return;
        setTransactions(txJson.data ?? []);
        setCategories(catJson.data ?? []);
        setSummary(sumJson.data ?? null);
        setSubscriptions(subJson.data ?? []);
        setMonthlyTotal(subJson.monthlyTotal ?? 0);
        setBudgets(budJson.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat data keuangan");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChanged = () => {
    void loadAll();
    setRefreshKey((k) => k + 1);
  };

  // Bulan tersedia untuk filter (dari data transaksi)
  const months = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.date) set.add(t.date.slice(0, 7));
    }
    set.add(new Date().toISOString().slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FinanceInsightPanel refreshKey={refreshKey} />

      <TransactionForm
        categories={categories}
        onSaved={handleChanged}
        onCategoryCreated={(cat) =>
          setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))
        }
      />

      <MonthlySummary data={summary} />

      <div className="grid gap-4 xl:grid-cols-2">
        <SubscriptionsPanel
          subscriptions={subscriptions}
          monthlyTotal={monthlyTotal}
          onChanged={handleChanged}
        />
        <BudgetPanel
          budgets={budgets}
          categories={categories}
          onChanged={handleChanged}
        />
      </div>

      <TransactionList
        transactions={transactions}
        categories={categories}
        months={months}
        onDelete={handleChanged}
      />
    </div>
  );
}
