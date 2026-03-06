import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { fetchMultiplePriceHistories, PriceHistoryResponse, PricePeriod } from '../../services/priceHistoryService';
import { Card, CardContent } from '../ui/card';

const PERIOD_OPTIONS: { value: PricePeriod; label: string }[] = [
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'ytd', label: 'YTD' }
];

const PnLTrendChart: React.FC = () => {
  const { currentAssets, baseCurrency, exchangeRate } = usePortfolioContext();
  const [period, setPeriod] = useState<PricePeriod>('1m');
  const [priceHistories, setPriceHistories] = useState<Record<string, PriceHistoryResponse>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentAssets.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const tickers = currentAssets.map((a: any) => a.ticker);
    fetchMultiplePriceHistories(tickers, period)
      .then(setPriceHistories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentAssets, period]);

  // ポートフォリオ全体の時系列データを構築
  const chartData = useMemo(() => {
    if (Object.keys(priceHistories).length === 0) return [];

    // 全日付を収集
    const dateSet = new Set<string>();
    Object.values(priceHistories).forEach(h => {
      h.prices.forEach(p => dateSet.add(p.date));
    });

    const dates = Array.from(dateSet).sort();

    // 各日付でポートフォリオ総額を計算
    return dates.map(date => {
      let totalValue = 0;

      for (const asset of currentAssets) {
        const history = priceHistories[asset.ticker];
        if (!history) {
          // 履歴がない銘柄は現在の価格で計算
          totalValue += (asset.price || 0) * (asset.holdings || 0);
          continue;
        }

        // その日付のclose価格を探す（なければ直近の過去データ）
        let price: number | null = null;
        for (let i = history.prices.length - 1; i >= 0; i--) {
          if (history.prices[i].date <= date) {
            price = history.prices[i].close;
            break;
          }
        }

        if (price === null) price = asset.price || 0;
        let val = price * (asset.holdings || 0);

        // 通貨変換
        if (asset.currency !== baseCurrency) {
          const rate = exchangeRate?.rate || 150;
          if (asset.currency === 'USD' && baseCurrency === 'JPY') val *= rate;
          else if (asset.currency === 'JPY' && baseCurrency === 'USD') val /= rate;
        }

        totalValue += val;
      }

      return {
        date,
        displayDate: `${date.substring(5, 7)}/${date.substring(8, 10)}`,
        value: Math.round(totalValue)
      };
    });
  }, [priceHistories, currentAssets, baseCurrency, exchangeRate]);

  const hasEnoughData = chartData.length >= 7;

  if (loading) {
    return (
      <Card elevation="low" padding="medium">
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasEnoughData) {
    return (
      <Card elevation="low" padding="medium">
        <CardContent>
          <h3 className="text-sm font-semibold text-foreground mb-2">資産推移</h3>
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              価格履歴を蓄積中です。数日後にグラフが表示されます。
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatYAxis = (value: number) => {
    if (baseCurrency === 'JPY') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
      return value.toString();
    }
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const formatTooltipValue = (value: number) => {
    if (baseCurrency === 'JPY') {
      return [`¥${value.toLocaleString()}`, '参考評価額'];
    }
    return [`$${value.toLocaleString()}`, '参考評価額'];
  };

  // 上昇/下降の色分け
  const isUp = chartData.length >= 2 && chartData[chartData.length - 1].value >= chartData[0].value;
  const chartColor = isUp ? 'var(--color-success-500, #10b981)' : 'var(--color-danger-500, #ef4444)';

  return (
    <Card elevation="low" padding="medium">
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            資産推移 <span className="text-xs text-muted-foreground font-normal">※参考値</span>
          </h3>
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  period === opt.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e5e7eb)" />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 10, fill: 'var(--color-muted-foreground, #9ca3af)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 10, fill: 'var(--color-muted-foreground, #9ca3af)' }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              formatter={formatTooltipValue}
              labelFormatter={(label) => `日付: ${label}`}
              contentStyle={{
                backgroundColor: 'var(--color-card, #fff)',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={2}
              fill="url(#pnlGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PnLTrendChart;
