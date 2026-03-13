/**
 * WeeklyRebalanceCard - 週次リバランスチェック
 *
 * ユーザーに「能動的アクション」を促すカード。
 * 目標配分との乖離が閾値を超えた銘柄を表示し、
 * リバランスアクションへ誘導する。
 *
 * 競合分析の反面教師:
 * - 43juni/マネフォ: 「見るだけ」で終わるUI → アクション動機なし
 * - Duolingo: 「5分のレッスン」が毎日のアクション → 習慣化の鍵
 * - Strava: 「今週の走行距離」が次のランを促す
 *
 * PortfolioWise では「乖離チェック → 設定画面で調整」という
 * 能動的フローを毎週の訪問動機にする。
 *
 * @file src/components/dashboard/WeeklyRebalanceCard.tsx
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

/** 乖離閾値（%）— これ以上ずれた銘柄をハイライト */
const DRIFT_THRESHOLD = 3;

interface DriftItem {
  ticker: string;
  name: string;
  currentPct: number;
  targetPct: number;
  driftPct: number;
  direction: 'over' | 'under';
}

const WeeklyRebalanceCard: React.FC = () => {
  const navigate = useNavigate();
  const { currentAssets, targetPortfolio, baseCurrency, exchangeRate } = usePortfolioContext();

  const { driftItems, maxDrift, portfolioHealthy } = useMemo(() => {
    if (currentAssets.length === 0 || targetPortfolio.length === 0) {
      return { driftItems: [], maxDrift: 0, portfolioHealthy: true };
    }

    const rate = exchangeRate?.rate || 150;

    // 現在の総資産額（baseCurrency換算）
    const totalValue = currentAssets.reduce((sum, a) => {
      let val = (a.price || 0) * (a.holdings || 0);
      const c = a.currency || 'USD';
      if (c !== baseCurrency) {
        if (c === 'USD' && baseCurrency === 'JPY') val *= rate;
        else if (c === 'JPY' && baseCurrency === 'USD') val /= rate;
      }
      return sum + val;
    }, 0);

    if (totalValue === 0) return { driftItems: [], maxDrift: 0, portfolioHealthy: true };

    // 銘柄ごとの現在比率を計算
    const currentPctMap = new Map<string, number>();
    for (const a of currentAssets) {
      let val = (a.price || 0) * (a.holdings || 0);
      const c = a.currency || 'USD';
      if (c !== baseCurrency) {
        if (c === 'USD' && baseCurrency === 'JPY') val *= rate;
        else if (c === 'JPY' && baseCurrency === 'USD') val /= rate;
      }
      currentPctMap.set(a.ticker, (val / totalValue) * 100);
    }

    // 目標との乖離を計算
    const items: DriftItem[] = [];
    for (const t of targetPortfolio) {
      const targetPct = t.targetPercentage || 0;
      const currentPct = currentPctMap.get(t.ticker) || 0;
      const driftPct = currentPct - targetPct;

      if (Math.abs(driftPct) >= DRIFT_THRESHOLD) {
        items.push({
          ticker: t.ticker,
          name: t.name || t.ticker,
          currentPct: Math.round(currentPct * 10) / 10,
          targetPct: Math.round(targetPct * 10) / 10,
          driftPct: Math.round(driftPct * 10) / 10,
          direction: driftPct > 0 ? 'over' : 'under',
        });
      }
    }

    // 乖離が大きい順にソート
    items.sort((a, b) => Math.abs(b.driftPct) - Math.abs(a.driftPct));

    const maxDrift = items.length > 0 ? Math.abs(items[0].driftPct) : 0;

    return {
      driftItems: items.slice(0, 5),
      maxDrift,
      portfolioHealthy: items.length === 0,
    };
  }, [currentAssets, targetPortfolio, baseCurrency, exchangeRate]);

  // 目標配分未設定 or 資産なしの場合は非表示
  if (targetPortfolio.length === 0 || currentAssets.length === 0) return null;

  return (
    <Card elevation="low" padding="medium" data-testid="weekly-rebalance-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">リバランスチェック</CardTitle>
          {portfolioHealthy ? (
            <Badge variant="success" className="font-mono">良好</Badge>
          ) : (
            <Badge variant="warning" className="font-mono">
              最大乖離 {maxDrift.toFixed(1)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {portfolioHealthy ? (
          <p className="text-sm text-muted-foreground">
            目標配分との乖離は {DRIFT_THRESHOLD}% 以内です。次回の追加投資時に確認しましょう。
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              以下の銘柄が目標配分から {DRIFT_THRESHOLD}% 以上ずれています
            </p>
            <div className="space-y-2 mb-3">
              {driftItems.map(item => (
                <div key={item.ticker} data-testid="drift-item" className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-medium text-foreground w-14 shrink-0">
                      {item.ticker.length > 7 ? item.ticker.slice(0, 7) + '..' : item.ticker}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.currentPct}% → 目標 {item.targetPct}%
                    </span>
                  </div>
                  <span className={`font-mono text-xs font-semibold tabular-nums ${
                    item.direction === 'over'
                      ? 'text-warning-600 dark:text-warning-400'
                      : 'text-primary-600 dark:text-primary-400'
                  }`}>
                    {item.direction === 'over' ? '+' : ''}{item.driftPct}%
                  </span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/simulation')}
              className="w-full"
            >
              シミュレーションで調整する
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyRebalanceCard;
