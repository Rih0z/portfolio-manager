/**
 * monthlyReport
 *
 * 月次投資レポート生成ユーティリティ。
 * 月間リターン計算、トップ銘柄抽出、スコア変化を提供する。
 *
 * @file src/utils/monthlyReport.ts
 */

// ─── Types ───────────────────────────────────────────

interface ReportAsset {
  ticker: string;
  name?: string;
  currency?: string;
  price?: number;
  holdings?: number;
  purchasePrice?: number;
}

export interface MonthlyReportInput {
  month: string; // YYYY-MM
  currentAssets: ReportAsset[];
  openingTotalValue: number;
  baseCurrency: string;
  exchangeRate: number;
  portfolioScore?: number;
  previousMonthScore?: number;
}

export interface MonthlyReport {
  month: string;
  openingValue: number;
  closingValue: number;
  monthlyReturn: number;
  monthlyReturnPercent: number;
  topGainers: Array<{ ticker: string; name: string; pnlPercent: number }>;
  topLosers: Array<{ ticker: string; name: string; pnlPercent: number }>;
  scoreChange: number;
  holdingsCount: number;
}

interface ReturnResult {
  absoluteChange: number;
  percentChange: number;
}

// ─── Functions ───────────────────────────────────────

/**
 * 月間リターンを計算する
 */
export function calculateMonthlyReturn(
  openingValue: number,
  closingValue: number
): ReturnResult {
  const absoluteChange = closingValue - openingValue;
  const percentChange = openingValue > 0
    ? (absoluteChange / openingValue) * 100
    : 0;

  return { absoluteChange, percentChange };
}

/**
 * 月次レポートを生成する
 */
export function generateMonthlyReport(input: MonthlyReportInput): MonthlyReport {
  const {
    month,
    currentAssets,
    openingTotalValue,
    baseCurrency,
    exchangeRate,
    portfolioScore,
    previousMonthScore,
  } = input;

  // Calculate closing value
  const closingValue = currentAssets.reduce((sum, asset) => {
    const value = (asset.price || 0) * (asset.holdings || 0);
    // Convert to base currency if needed
    const convertedValue = asset.currency === baseCurrency
      ? value
      : baseCurrency === 'JPY'
        ? Math.round(value * exchangeRate * 100) / 100
        : Math.round((value / exchangeRate) * 100) / 100;
    return sum + convertedValue;
  }, 0);

  // Calculate monthly return
  const { absoluteChange, percentChange } = calculateMonthlyReturn(
    openingTotalValue,
    closingValue
  );

  // Calculate per-asset P&L for gainers/losers
  const assetPnLs = currentAssets
    .filter((a) => a.purchasePrice && a.purchasePrice > 0 && a.price)
    .map((a) => ({
      ticker: a.ticker,
      name: a.name || a.ticker,
      pnlPercent: ((a.price! - a.purchasePrice!) / a.purchasePrice!) * 100,
    }))
    .sort((a, b) => b.pnlPercent - a.pnlPercent);

  const topGainers = assetPnLs
    .filter((a) => a.pnlPercent > 0)
    .slice(0, 3);

  const topLosers = assetPnLs
    .filter((a) => a.pnlPercent < 0)
    .slice(-3)
    .reverse();

  // Score change
  const scoreChange = (portfolioScore ?? 0) - (previousMonthScore ?? 0);

  return {
    month,
    openingValue: openingTotalValue,
    closingValue: Math.round(closingValue),
    monthlyReturn: Math.round(absoluteChange),
    monthlyReturnPercent: Math.round(percentChange * 10) / 10,
    topGainers,
    topLosers,
    scoreChange,
    holdingsCount: currentAssets.length,
  };
}

/**
 * レポートサマリーをテキストでフォーマットする
 */
export function formatReportSummary(
  report: MonthlyReport,
  currency: string,
  locale: string = 'ja'
): string {
  const [year, monthNum] = report.month.split('-').map(Number);
  const isJa = locale === 'ja';

  const formatAmount = (amount: number): string => {
    const prefix = amount >= 0 ? '+' : '';
    if (currency === 'JPY') {
      return `${prefix}¥${Math.abs(Math.round(amount)).toLocaleString()}`;
    }
    return `${prefix}$${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const returnSign = report.monthlyReturnPercent >= 0 ? '+' : '';

  if (isJa) {
    return [
      `${year}年${monthNum}月 投資レポート`,
      `保有銘柄: ${report.holdingsCount}件`,
      `月間リターン: ${formatAmount(report.monthlyReturn)}（${returnSign}${report.monthlyReturnPercent}%）`,
      report.scoreChange !== 0
        ? `ポートフォリオスコア: ${report.scoreChange > 0 ? '+' : ''}${report.scoreChange}pt`
        : '',
      report.topGainers.length > 0
        ? `トップ銘柄: ${report.topGainers.map((g) => `${g.ticker}(+${g.pnlPercent.toFixed(1)}%)`).join(', ')}`
        : '',
      report.topLosers.length > 0
        ? `下落銘柄: ${report.topLosers.map((l) => `${l.ticker}(${l.pnlPercent.toFixed(1)}%)`).join(', ')}`
        : '',
    ].filter(Boolean).join('\n');
  }

  return [
    `${year}-${String(monthNum).padStart(2, '0')} Investment Report`,
    `Holdings: ${report.holdingsCount}`,
    `Monthly Return: ${formatAmount(report.monthlyReturn)} (${returnSign}${report.monthlyReturnPercent}%)`,
    report.scoreChange !== 0
      ? `Portfolio Score: ${report.scoreChange > 0 ? '+' : ''}${report.scoreChange}pt`
      : '',
  ].filter(Boolean).join('\n');
}
