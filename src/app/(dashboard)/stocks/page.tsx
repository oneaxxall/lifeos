import { StocksWorkspace } from "@/components/stocks/stocks-workspace";

export const metadata = {
  title: "Stocks Calculator — LifeOS",
  description: "Avg down, right issue (HMETD), dan estimasi biaya broker saham.",
};

export default function StocksPage() {
  return <StocksWorkspace />;
}
