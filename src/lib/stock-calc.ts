/** Kalkulasi saham — client-safe (deterministik, tanpa DB). */

export const LOT_SIZE = 100;
/** Fee broker (IDX standar): beli ~0.18%, jual ~0.28% + pajak 0.1% */
export const FEE_BUY_PCT = 0.0018;
export const FEE_SELL_PCT = 0.0028;
export const TAX_SELL_PCT = 0.001;

export function fmtRp(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

/* ═══════════ 1. AVG DOWN / AVG UP ═══════════ */

export interface AvgDownInput {
  sharesOld: number;
  priceOld: number;
  sharesNew: number;
  priceNew: number;
  marketPrice: number;
}

export interface AvgDownResult {
  totalShares: number;
  totalCost: number;
  avgCost: number;
  avgDiffPct: number;
  /** Harga jual minimal agar balik modal (modal + fee) */
  breakEvenPrice: number;
  /** P/L jika dijual di harga pasar sekarang (setelah fee) */
  unrealizedPct: number;
  unrealizedRp: number;
  /** Harga target untuk untung X% (dari avg cost) */
  targetPrice: (pct: number) => number;
}

export function calcAvgDown(p: AvgDownInput): AvgDownResult {
  const sharesOld = Math.max(0, p.sharesOld);
  const sharesNew = Math.max(0, p.sharesNew);
  const priceOld = Math.max(0, p.priceOld);
  const priceNew = Math.max(0, p.priceNew);
  const totalShares = sharesOld + sharesNew;
  const totalCost = sharesOld * priceOld + sharesNew * priceNew;
  const avgCost = totalShares > 0 ? totalCost / totalShares : 0;

  const avgDiffPct = avgCost > 0 ? ((priceNew - avgCost) / avgCost) * 100 : 0;

  // Balik modal: cari harga BE sehingga BE×shares×(1-fee) = totalCost
  const breakEvenPrice =
    totalShares > 0 ? totalCost / (totalShares * (1 - FEE_SELL_PCT - TAX_SELL_PCT)) : 0;

  // P/L unrealized di harga pasar
  const gross = p.marketPrice > 0 ? p.marketPrice * totalShares : 0;
  const net = gross > 0 ? gross * (1 - FEE_SELL_PCT - TAX_SELL_PCT) : 0;
  const unrealizedRp = net - totalCost;
  const unrealizedPct = totalCost > 0 ? (unrealizedRp / totalCost) * 100 : 0;

  const targetPrice = (pct: number) =>
    totalShares > 0
      ? (totalCost * (1 + pct / 100)) / (totalShares * (1 - FEE_SELL_PCT - TAX_SELL_PCT))
      : 0;

  return {
    totalShares,
    totalCost: Math.round(totalCost),
    avgCost: Math.round(avgCost * 100) / 100,
    avgDiffPct: Math.round(avgDiffPct * 10) / 10,
    breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
    unrealizedPct: Math.round(unrealizedPct * 10) / 10,
    unrealizedRp: Math.round(unrealizedRp),
    targetPrice,
  };
}

/* ═══════════ 2. RIGHT ISSUE (HMETD) ═══════════ */

export interface RightIssueInput {
  sharesOwned: number;
  /** Rasio: setiap `ratioOld` saham lama → berhak `ratioNew` saham baru */
  ratioOld: number;
  ratioNew: number;
  /** Harga pelaksanaan (exercise price) per lembar */
  exercisePrice: number;
  /** Harga pasar saat cum-right */
  marketPrice: number;
}

export interface RightIssueResult {
  /** Jumlah right yang didapat (lembar saham baru) */
  rights: number;
  /** Harga teoritis ex-right (TERP) */
  terp: number;
  /** Nilai teoritis per right */
  rightValue: number;
  /** Dana yang dibutuhkan jika ikut semua right */
  costToSubscribe: number;
  /** Kepemilikan % sebelum */
  ownershipBefore: number;
  /** Kepemilikan % setelah ikut */
  ownershipAfter: number;
  /** Dilusi kepemilikan jika TIDAK ikut (%) */
  dilutionPct: number;
  /** Harga implisit turun dari cum ke ex-right (%) */
  priceDropPct: number;
}

export function calcRightIssue(p: RightIssueInput): RightIssueResult {
  const sharesOwned = Math.max(0, p.sharesOwned);
  const ratioOld = Math.max(1, p.ratioOld);
  const ratioNew = Math.max(1, p.ratioNew);
  const exercisePrice = Math.max(0, p.exercisePrice);
  const marketPrice = Math.max(0, p.marketPrice);

  // Right = floor(saham / ratioOld) × ratioNew
  const rights = Math.floor(sharesOwned / ratioOld) * ratioNew;

  const totalSharesAfter = sharesOwned + rights;
  const totalValue = sharesOwned * marketPrice + rights * exercisePrice;
  const terp = totalSharesAfter > 0 ? totalValue / totalSharesAfter : 0;

  // Nilai right = harga cum − harga teoritis (per right → konversi per lembar baru)
  const rightValue = Math.max(0, marketPrice - terp);

  const costToSubscribe = rights * exercisePrice;

  const ownershipBefore = 100; // asumsi total pasar = saham user (relatif)
  const ownershipAfter = rights > 0 ? (sharesOwned / (sharesOwned + rights)) * 100 : 100;
  // Dilusi jika TIDAK ikut right: proporsi lembar baru terhadap total setelah right
  const dilutionPct =
    totalSharesAfter > 0 ? (rights / totalSharesAfter) * 100 : 0;

  const priceDropPct = marketPrice > 0 ? ((marketPrice - terp) / marketPrice) * 100 : 0;

  return {
    rights,
    terp: Math.round(terp * 100) / 100,
    rightValue: Math.round(rightValue * 100) / 100,
    costToSubscribe: Math.round(costToSubscribe),
    ownershipBefore: Math.round(ownershipBefore * 10) / 10,
    ownershipAfter: Math.round(ownershipAfter * 10) / 10,
    dilutionPct: Math.round(Math.abs(dilutionPct) * 10) / 10,
    priceDropPct: Math.round(priceDropPct * 10) / 10,
  };
}

/* ═══════════ 3. LOT & FEE BROKER ═══════════ */

export interface LotFeeInput {
  lot: number;
  buyPrice: number;
  sellPrice: number;
}

export interface LotFeeResult {
  shares: number;
  buyValue: number;
  buyFee: number;
  sellValue: number;
  sellFee: number;
  taxSell: number;
  /** Total biaya (beli fee + jual fee + pajak) */
  totalFees: number;
  /** Laba bersih setelah semua biaya */
  netProfit: number;
  netProfitPct: number;
  /** Harga jual minimal agar tidak rugi */
  breakEvenSell: number;
}

export function calcLotFee(p: LotFeeInput): LotFeeResult {
  const lot = Math.max(0, p.lot);
  const buyPrice = Math.max(0, p.buyPrice);
  const sellPrice = Math.max(0, p.sellPrice);

  const shares = lot * LOT_SIZE;
  const buyValue = shares * buyPrice;
  const buyFee = buyValue * FEE_BUY_PCT;
  const sellValue = shares * sellPrice;
  const sellFee = sellValue * FEE_SELL_PCT;
  const taxSell = sellValue * TAX_SELL_PCT;
  const totalFees = buyFee + sellFee + taxSell;
  const netProfit = sellValue - sellFee - taxSell - buyValue - buyFee;
  const netProfitPct = buyValue > 0 ? (netProfit / buyValue) * 100 : 0;

  const breakEvenSell =
    buyPrice > 0
      ? (buyValue + buyFee) / (shares * (1 - FEE_SELL_PCT - TAX_SELL_PCT))
      : 0;

  return {
    shares,
    buyValue: Math.round(buyValue),
    buyFee: Math.round(buyFee),
    sellValue: Math.round(sellValue),
    sellFee: Math.round(sellFee),
    taxSell: Math.round(taxSell),
    totalFees: Math.round(totalFees),
    netProfit: Math.round(netProfit),
    netProfitPct: Math.round(netProfitPct * 10) / 10,
    breakEvenSell: Math.round(breakEvenSell * 100) / 100,
  };
}
