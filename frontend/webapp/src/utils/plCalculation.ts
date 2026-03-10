import { PriceHistoryResponse } from '../services/priceHistoryService';

export interface PortfolioAsset {
  ticker: string;
  name?: string;
  currency?: string;
  purchasePrice?: number;
  price?: number;
  holdings?: number;
}

export interface AssetPnL {
  ticker: string;
  name: string;
  currency: string;
  purchasePrice: number | null;
  currentPrice: number;
  holdings: number;
  investment: number | null;
  currentValue: number;
  pnl: number | null;
  pnlPercent: number | null;
  dayChange: number | null;
  dayChangePercent: number | null;
  ytdChange: number | null;
  ytdChangePercent: number | null;
  hasPurchasePrice: boolean;
}

export interface PortfolioPnL {
  totalInvestment: number;
  totalCurrentValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  totalDayChange: number;
  totalDayChangePercent: number;
  totalYtdChange: number;
  totalYtdChangePercent: number;
  assets: AssetPnL[];
  assetsWithPurchasePrice: number;
  assetsTotal: number;
  isReferenceValue: true;
}

/**
 * 通貨変換ヘルパー
 */
const convertToBase = (
  amount: number,
  fromCurrency: string,
  baseCurrency: string,
  exchangeRate: number
): number => {
  if (fromCurrency === baseCurrency) return amount;
  if (fromCurrency === 'USD' && baseCurrency === 'JPY') return amount * exchangeRate;
  if (fromCurrency === 'JPY' && baseCurrency === 'USD') return amount / exchangeRate;
  return amount;
};

/**
 * ポートフォリオ全体の損益を計算する
 *
 * - purchasePrice がない銘柄は損益計算から除外（「N/A」）
 * - 全数値は参考値（yahoo-finance2ベース）
 */
export const calculatePortfolioPnL = (
  assets: PortfolioAsset[],
  priceHistories: Record<string, PriceHistoryResponse>,
  baseCurrency: string,
  exchangeRate: number
): PortfolioPnL => {
  let totalInvestment = 0;
  let totalCurrentValue = 0;
  let pnlCurrentValue = 0; // purchasePrice がある資産のみの時価合計（PnL計算用）
  let totalDayChange = 0;
  let totalYtdChange = 0;
  let assetsWithPurchasePrice = 0;

  const assetPnLs: AssetPnL[] = assets.map((asset) => {
    const hasPurchasePrice = typeof asset.purchasePrice === 'number' && asset.purchasePrice > 0;
    const currentPrice = asset.price || 0;
    const holdings = asset.holdings || 0;
    const currency = asset.currency || 'USD';

    const currentValueRaw = currentPrice * holdings;
    const currentValueBase = convertToBase(currentValueRaw, currency, baseCurrency, exchangeRate);

    let investmentBase: number | null = null;
    let pnl: number | null = null;
    let pnlPercent: number | null = null;

    if (hasPurchasePrice && asset.purchasePrice !== undefined) {
      const investmentRaw = asset.purchasePrice * holdings;
      investmentBase = convertToBase(investmentRaw, currency, baseCurrency, exchangeRate);
      pnl = currentValueBase - investmentBase;
      pnlPercent = investmentBase > 0 ? (pnl / investmentBase) * 100 : 0;
      totalInvestment += investmentBase;
      pnlCurrentValue += currentValueBase;
      assetsWithPurchasePrice++;
    }

    totalCurrentValue += currentValueBase;

    // 前日比・年初来（価格履歴から取得）
    const history = priceHistories[asset.ticker];
    let dayChange: number | null = null;
    let dayChangePercent: number | null = null;
    let ytdChange: number | null = null;
    let ytdChangePercent: number | null = null;

    if (history?.change) {
      if (history.change.dayOverDay) {
        const dayChangePerUnit = history.change.dayOverDay.amount;
        dayChange = convertToBase(dayChangePerUnit * holdings, currency, baseCurrency, exchangeRate);
        dayChangePercent = history.change.dayOverDay.percent;
        totalDayChange += dayChange;
      }
      if (history.change.yearToDate) {
        const ytdChangePerUnit = history.change.yearToDate.amount;
        ytdChange = convertToBase(ytdChangePerUnit * holdings, currency, baseCurrency, exchangeRate);
        ytdChangePercent = history.change.yearToDate.percent;
        totalYtdChange += ytdChange;
      }
    }

    return {
      ticker: asset.ticker,
      name: asset.name || asset.ticker,
      currency,
      purchasePrice: hasPurchasePrice && asset.purchasePrice !== undefined ? asset.purchasePrice : null,
      currentPrice,
      holdings,
      investment: investmentBase,
      currentValue: currentValueBase,
      pnl,
      pnlPercent,
      dayChange,
      dayChangePercent,
      ytdChange,
      ytdChangePercent,
      hasPurchasePrice
    };
  });

  const totalPnL = assetsWithPurchasePrice > 0 ? pnlCurrentValue - totalInvestment : 0;
  const totalPnLPercent = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;
  const totalDayChangePercent = totalCurrentValue > 0 ? (totalDayChange / totalCurrentValue) * 100 : 0;
  const totalYtdChangePercent = totalCurrentValue > 0 ? (totalYtdChange / totalCurrentValue) * 100 : 0;

  return {
    totalInvestment,
    totalCurrentValue,
    totalPnL,
    totalPnLPercent,
    totalDayChange,
    totalDayChangePercent,
    totalYtdChange,
    totalYtdChangePercent,
    assets: assetPnLs,
    assetsWithPurchasePrice,
    assetsTotal: assets.length,
    isReferenceValue: true
  };
};
