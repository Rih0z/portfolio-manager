import React, { useMemo, useEffect, useState } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { calculatePortfolioPnL, PortfolioPnL } from '../../utils/plCalculation';
import { fetchMultiplePriceHistories, PriceHistoryResponse } from '../../services/priceHistoryService';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { trackEvent, AnalyticsEvents } from '../../utils/analytics';

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
      return;
    }

    const tickers = currentAssets.map((a: any) => a.ticker);
    fetchMultiplePriceHistories(tickers, '1m')
      .then(setPriceHistories)
      .catch(() => {})
      .finally(() => setLoading(false));

    trackEvent(AnalyticsEvents.PNL_VIEW);
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

  if (loading) {
    return (
      <Card elevation="low" padding="medium">
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation="low" padding="medium">
      <CardContent>
        {hasPurchaseData ? (
          <div className="space-y-3">
            {/* 総投資額 */}
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">総投資額</span>
              <span className="text-base font-semibold font-mono tabular-nums text-foreground">
                {formatCurrency(pnl.totalInvestment, baseCurrency)}
              </span>
            </div>

            {/* 参考評価額 */}
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                参考評価額 <span className="text-xs">※</span>
              </span>
              <span className="text-lg font-bold font-mono tabular-nums text-foreground">
                {formatCurrency(pnl.totalCurrentValue, baseCurrency)}
              </span>
            </div>

            {/* 参考損益 */}
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                参考損益 <span className="text-xs">※</span>
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold font-mono tabular-nums ${
                  pnl.totalPnL >= 0 ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {pnl.totalPnL >= 0 ? '+' : ''}{formatCurrency(pnl.totalPnL, baseCurrency)}
                </span>
                <Badge variant={pnl.totalPnL >= 0 ? 'success' : 'danger'}>
                  {formatPercent(pnl.totalPnLPercent)}
                </Badge>
              </div>
            </div>

            {/* 前日比 */}
            {pnl.totalDayChange !== 0 && (
              <div className="flex items-baseline justify-between pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  前日比 <span className="text-xs">※</span>
                </span>
                <span className={`text-sm font-mono tabular-nums ${
                  pnl.totalDayChange >= 0 ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {pnl.totalDayChange >= 0 ? '+' : ''}{formatCurrency(pnl.totalDayChange, baseCurrency)}
                  {' '}({formatPercent(pnl.totalDayChangePercent)})
                </span>
              </div>
            )}

            {/* 免責表示 */}
            <p className="text-xs text-muted-foreground pt-2 border-t border-border leading-relaxed">
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
      </CardContent>
    </Card>
  );
};

export default PnLSummary;
