import { DebtsWorkspace } from "@/components/debts/debts-workspace";

export const metadata = {
  title: "Hutang & Piutang — LifeOS",
  description: "Kelola utang-piutang: sekali bayar atau cicilan, status & jatuh tempo.",
};

export default function DebtsPage() {
  return <DebtsWorkspace />;
}
