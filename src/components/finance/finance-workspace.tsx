"use client";

import * as React from "react";
import { toast } from "sonner";
import { TransactionForm } from "@/components/finance/transaction-form";
import { TransactionList, type TransactionItem } from "@/components/finance/transaction-list";
import { MonthlySummary, type MonthlySummaryData } from "@/components/finance/monthly-summary";
import { SubscriptionsPanel, type SubscriptionItem } from "@/components/finance/subscriptions-panel";
import { BudgetPanel, type BudgetItem } from "@/components/finance/budget-panel";
import { FinanceInsightPanel } from "@/components/finance/finance-insight-panel";
import { CategoryMenu, type CategoryMenuItem } from "@/components/ui/category-menu";
import { CategoryManagerDialog } from "@/components/ui/category-manager-dialog";
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
  const [categoryItems, setCategoryItems] = React.useState<CategoryMenuItem[]>([]);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [menuCategoryId, setMenuCategoryId] = React.useState<number | null>(null);

  const loadCategories = React.useCallback(async () => {
    try {
      const res = await fetch("/api/finance/categories");
      const json = await res.json();
      setCategoryItems(json.data ?? []);
    } catch {
      /* abaikan */
    }
  }, []);

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
        setCategoryItems(catJson.data ?? []);
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

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        {/* Group menu kategori */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <CategoryMenu
            title="Kategori Transaksi"
            items={categoryItems}
            activeId={menuCategoryId}
            onSelect={setMenuCategoryId}
            onManage={() => setManageOpen(true)}
          />
        </aside>

        {/* Konten utama */}
        <div className="min-w-0 space-y-5">
          <TransactionForm
            categories={categories}
            onSaved={handleChanged}
            onCategoryCreated={(cat) => {
              setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
              void loadCategories();
            }}
          />

          <MonthlySummary data={summary} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
            menuCategoryId={menuCategoryId}
            onDelete={handleChanged}
          />
        </div>
      </div>

      <CategoryManagerDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        title="Kelola kategori transaksi"
        baseUrl="/api/finance/categories"
        items={categoryItems}
        onChanged={() => {
          void loadCategories();
          void loadAll();
        }}
      />
    </div>
  );
}
