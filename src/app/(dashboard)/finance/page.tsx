import { FinanceWorkspace } from "@/components/finance/finance-workspace";

export const metadata = {
  title: "Finance — LifeOS",
  description: "Pencatatan uang masuk/keluar, ringkasan bulanan, dan analisa AI.",
};

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Finance</h1>
        <p className="text-muted-foreground">
          Catat transaksi cepat, pantau pengeluaran per kategori.
        </p>
      </header>

      <FinanceWorkspace />
    </div>
  );
}
