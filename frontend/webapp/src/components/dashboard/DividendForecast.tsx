/**
 * DividendForecast - 配当予測カード
 *
 * 43juniの主力機能を取り入れた配当管理ビュー。
 * 年間配当予測、月別配当スケジュール、
 * トップ配当銘柄を表示する。
 *
 * @file src/components/dashboard/DividendForecast.tsx
 */
import React, { useMemo } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface MonthlyDividend {
  month: number;
  label: string;
  amount: number;
}

interface AssetDividend {
  ticker: string;
  name: string;
  annualAmount: number;
  yield: number;
  frequency: string;
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

/**
 * 資産価値を baseCurrency に換算する
 * ※ 通貨換算バグ再発防止ルール準拠（9-BX）
 */
const convertToBaseCurrency = (
  value: number,
  assetCurrency: string,
  baseCurrency: string,
  exchangeRate: number
): number => {
  if (assetCurrency === baseCurrency) return value;
  if (assetCurrency === 'USD' && baseCurrency === 'JPY') return value * exchangeRate;
  if (assetCurrency === 'JPY' && baseCurrency === 'USD') return value / exchangeRate;
  return value;
};

const FREQUENCY_MAP: Record<string, number[]> = {
  monthly: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  quarterly: [2, 5, 8, 11],      // 3月, 6月, 9月, 12月
  'semi-annual': [5, 11],         // 6月, 12月
  annual: [11],                   // 12月
};

const formatCurrency = (value: number, currency: string): string => {
  if (currency === 'JPY') {
    return `¥${Math.round(value).toLocaleString()}`;
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const DividendForecast: React.FC = () => {
  const { currentAssets, baseCurrency, exchangeRate } = usePortfolioContext();

  const { monthlyData, topAssets, annualTotal, weightedYield } = useMemo(() => {
    const rate = exchangeRate?.rate || 150;
    const dividendAssets: AssetDividend[] = [];

    // 配当のある資産を集計
    for (const asset of currentAssets) {
      if (!asset.hasDividend || !asset.dividendYield || asset.dividendYield <= 0) continue;

      const assetValue = (asset.price || 0) * (asset.holdings || 0);
      const convertedValue = convertToBaseCurrency(assetValue, asset.currency || 'USD', baseCurrency, rate);
      const annualAmount = convertedValue * (asset.dividendYield / 100);

      dividendAssets.push({
        ticker: asset.ticker,
        name: asset.name || asset.ticker,
        annualAmount,
        yield: asset.dividendYield,
        frequency: asset.dividendFrequency || 'quarterly',
      });
    }

    // 月別集計
    const monthly: number[] = new Array(12).fill(0);
    for (const da of dividendAssets) {
      const months = FREQUENCY_MAP[da.frequency] || FREQUENCY_MAP.quarterly;
      const perPayment = da.annualAmount / months.length;
      for (const m of months) {
        monthly[m] += perPayment;
      }
    }

    const monthlyData: MonthlyDividend[] = monthly.map((amount, i) => ({
      month: i,
      label: MONTH_LABELS[i],
      amount,
    }));

    const annualTotal = dividendAssets.reduce((sum, d) => sum + d.annualAmount, 0);

    // 加重平均利回り
    const totalValue = currentAssets.reduce((sum, a) => {
      const val = (a.price || 0) * (a.holdings || 0);
      return sum + convertToBaseCurrency(val, a.currency || 'USD', baseCurrency, rate);
    }, 0);
    const weightedYield = totalValue > 0 ? (annualTotal / totalValue) * 100 : 0;

    // トップ配当銘柄（上位5件）
    const topAssets = [...dividendAssets]
      .sort((a, b) => b.annualAmount - a.annualAmount)
      .slice(0, 5);

    return { monthlyData, topAssets, annualTotal, weightedYield };
  }, [currentAssets, baseCurrency, exchangeRate]);

  // 配当資産がなければ非表示
  if (topAssets.length === 0) return null;

  const maxMonthly = Math.max(...monthlyData.map(d => d.amount), 1);

  return (
    <Card elevation="low" padding="medium" data-testid="dividend-forecast">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">配当予測</CardTitle>
          <Badge variant="success" className="font-mono tabular-nums">
            年間 {formatCurrency(annualTotal, baseCurrency)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          加重平均配当利回り: <span className="font-mono font-semibold">{weightedYield.toFixed(2)}%</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 月別配当バーチャート */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">月別配当スケジュール</h4>
          <div className="flex items-end gap-1 h-20">
            {monthlyData.map(d => {
              const heightPercent = maxMonthly > 0 ? (d.amount / maxMonthly) * 100 : 0;
              const hasAmount = d.amount > 0;
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.label}: ${formatCurrency(d.amount, baseCurrency)}`}>
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      hasAmount ? 'bg-success-400 dark:bg-success-500' : 'bg-muted'
                    }`}
                    style={{ height: `${Math.max(heightPercent, 4)}%`, minHeight: '2px' }}
                  />
                  <span className="text-[9px] text-muted-foreground leading-none">
                    {d.month + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* トップ配当銘柄 */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">配当上位銘柄</h4>
          <div className="space-y-1.5">
            {topAssets.map(asset => (
              <div key={asset.ticker} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-medium text-foreground w-12 shrink-0">
                    {asset.ticker.length > 6 ? asset.ticker.slice(0, 6) + '...' : asset.ticker}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {asset.yield.toFixed(1)}%
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-success-600 dark:text-success-400 tabular-nums">
                  {formatCurrency(asset.annualAmount, baseCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DividendForecast;
