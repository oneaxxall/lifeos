import { StockDetail } from "@/components/portfolio/stock-detail";

export const metadata = {
  title: "Detail Saham — LifeOS",
  description: "Detail posisi saham: lot, harga, P&L & alokasi portofolio.",
};

export default async function StockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StockDetail id={Number(id)} />;
}
