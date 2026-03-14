import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { calculatePortfolioPnL, PortfolioPnL } from '../../utils/plCalculation';
import { fetchMultiplePriceHistories, PriceHistoryResponse } from '../../services/priceHistoryService';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { trackEvent, AnalyticsEvents } from '../../utils/analytics';
import logger from '../../utils/logger';

type PeriodKey = '1d' | '1w' | '1m';
const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: '1d', label: '前日比' },
  { key: '1w', label: '週間' },
  { key: '1m', label: '月間' },
];

const formatCurrency = (value: number, currency: string): string => {
  if (currency === 'JPY') {
    return `¥${Math.round(value).toLocaleString()}`;
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

const PnLSummary: React.FC = () => {
  const { currentAssets, baseCurrency, exchangeRate } = usePortfolioContext();
  const [priceHistories, setPriceHistories] = useState<Record<string, PriceHistoryResponse>>({});
  const [loading, setLoading] = useState(true);

  // 価格履歴の取得
  useEffect(() => {
    if (currentAssets.length === 0) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const tickers = currentAssets.map((a: { ticker: string }) => a.ticker);

    fetchMultiplePriceHistories(tickers, '1m')
      .then(data => { if (!cancelled) setPriceHistories(data); })
      .catch(error => {
        if (!cancelled) {
          logger.warn('[PnLSummary] Failed to fetch price histories:', error.message);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    trackEvent(AnalyticsEvents.PNL_VIEW);

    return () => { cancelled = true; };
  }, [currentAssets]);

  const pnl: PortfolioPnL = useMemo(() => {
    return calculatePortfolioPnL(
      currentAssets,
      priceHistories,
      baseCurrency,
      exchangeRate?.rate || 150
    );
  }, [currentAssets, priceHistories, baseCurrency, exchangeRate]);

  const hasPurchaseData = pnl.assetsWithPurchasePrice > 0;
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('1d');

  // 期間別変動値の取得
  const periodChange = useMemo(() => {
    if (selectedPeriod === '1d') {
      return { amount: pnl.totalDayChange, percent: pnl.totalDayChangePercent };
    }
    if (selectedPeriod === '1w') {
      return { amount: pnl.totalWeekChange ?? pnl.totalDayChange, percent: pnl.totalWeekChangePercent ?? pnl.totalDayChangePercent };
    }
    // 1m
    return { amount: pnl.totalPnL, percent: pnl.totalPnLPercent };
  }, [selectedPeriod, pnl]);

  const isPositive = pnl.totalPnL >= 0;
  const isPeriodPositive = periodChange.amount >= 0;

  if (loading) {
    return (
      <Card elevation="low" padding="medium">
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-10 bg-muted rounded w-2/3"></div>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation="low" padding="medium" data-testid="pnl-summary" className={hasPurchaseData ? `border-l-4 ${isPositive ? 'border-l-success-500' : 'border-l-danger-500'}` : ''}>
      <CardContent>
        <div role="img" aria-label={hasPurchaseData ? `ポートフォリオ損益サマリー: 総投資額 ${formatCurrency(pnl.totalInvestment, baseCurrency)}、参考評価額 ${formatCurrency(pnl.totalCurrentValue, baseCurrency)}、損益 ${pnl.totalPnL >= 0 ? '+' : ''}${formatCurrency(pnl.totalPnL, baseCurrency)} (${formatPercent(pnl.totalPnLPercent)})` : '損益データがありません'}>
        {hasPurchaseData ? (
          <div className="space-y-4">
            {/* ヒーローセクション: 評価額 + 損益 */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">参考評価額</span>
                <span className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-foreground leading-none">
                  {formatCurrency(pnl.totalCurrentValue, baseCurrency)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${
                  isPositive ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {isPositive ? '+' : ''}{formatCurrency(pnl.totalPnL, baseCurrency)}
                </span>
                <Badge variant={isPositive ? 'success' : 'danger'} className="text-sm font-mono tabular-nums">
                  {formatPercent(pnl.totalPnLPercent)}
                </Badge>
              </div>
            </div>

            {/* 総投資額（サブ情報） */}
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground">投資額</span>
              <span className="text-sm font-mono tabular-nums text-muted-foreground">
                {formatCurrency(pnl.totalInvestment, baseCurrency)}
              </span>
              <abbr title="yahoo-finance2参考値に基づく概算" className="text-xs text-muted-foreground no-underline cursor-help">※参考値</abbr>
            </div>

            {/* 期間セレクタ + 変動値 */}
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex gap-1" role="group" aria-label="変動期間">
                  {PERIOD_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setSelectedPeriod(opt.key)}
                      className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors ${
                        selectedPeriod === opt.key
                          ? 'bg-primary-500 text-white'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                      aria-pressed={selectedPeriod === opt.key}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span className={`text-base font-semibold font-mono tabular-nums ${
                  isPeriodPositive ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {isPeriodPositive ? '+' : ''}{formatCurrency(periodChange.amount, baseCurrency)}
                  {' '}
                  <span className="text-xs">({formatPercent(periodChange.percent)})</span>
                </span>
              </div>
            </div>

            {/* 免責表示 */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              ※ yahoo-finance2参考値に基づく概算です。実際の評価額は証券会社でご確認ください。
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-muted-foreground text-sm mb-2">
              損益データがありません
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              CSVインポートで取得単価を読み込むと損益が表示されます。
              設定画面から証券会社のCSVファイルをインポートしてください。
            </p>
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PnLSummary;
