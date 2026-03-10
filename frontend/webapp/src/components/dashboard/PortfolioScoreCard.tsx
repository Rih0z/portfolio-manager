/**
 * ポートフォリオスコアカード
 *
 * 100点満点のポートフォリオスコアを CircularProgress で表示し、
 * 各指標を横バーで可視化する。Free/Standard プランで表示指標数を切替。
 *
 * @file src/components/dashboard/PortfolioScoreCard.tsx
 */
import React, { useMemo } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { useIsPremium } from '../../hooks/queries';
import { calculatePortfolioScore, type ScoreMetric, type PortfolioScoreResult } from '../../utils/portfolioScore';
import { CircularProgress } from '../ui/progress';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

// ─── Grade Badge ─────────────────────────────────────────

const gradeBadgeVariant = (grade: string): 'success' | 'default' | 'warning' | 'danger' | 'secondary' => {
  switch (grade) {
    case 'S': return 'success';
    case 'A': return 'success';
    case 'B': return 'default';
    case 'C': return 'warning';
    case 'D': return 'danger';
    case 'F': return 'danger';
    default: return 'secondary';
  }
};

// ─── Metric Bar ──────────────────────────────────────────

interface MetricBarProps {
  metric: ScoreMetric;
  locked?: boolean;
}

function MetricBar({ metric, locked }: MetricBarProps) {
  const barColor = (score: number) => {
    if (score >= 80) return 'bg-success-500';
    if (score >= 60) return 'bg-primary-500';
    if (score >= 40) return 'bg-warning-500';
    return 'bg-danger-500';
  };

  if (locked) {
    return (
      <div className="flex items-center gap-3 py-1.5 opacity-50">
        <div className="w-24 sm:w-28 text-xs text-muted-foreground truncate flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="truncate">{metric.label}</span>
        </div>
        <div className="flex-1 h-2 rounded-full bg-muted" />
        <span className="w-8 text-right text-xs text-muted-foreground font-mono">—</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-24 sm:w-28 text-xs text-muted-foreground truncate" title={metric.description}>
        {metric.label}
      </div>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor(metric.score))}
          style={{ width: `${metric.score}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-8 text-right text-xs font-mono font-medium text-foreground">
          {metric.score}
        </span>
        <Badge variant={gradeBadgeVariant(metric.grade)} className="text-[10px] px-1.5 py-0">
          {metric.grade}
        </Badge>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

function PortfolioScoreCard() {
  const { currentAssets, targetPortfolio } = usePortfolioContext();
  const isPremium = useIsPremium();

  const scoreResult: PortfolioScoreResult = useMemo(() => {
    return calculatePortfolioScore(currentAssets, targetPortfolio, isPremium);
  }, [currentAssets, targetPortfolio, isPremium]);

  const freeMetrics = scoreResult.metrics.filter((m) => !m.isPremium);
  const premiumMetrics = scoreResult.metrics.filter((m) => m.isPremium);

  return (
    <Card elevation="low" padding="medium" className="overflow-hidden" data-testid="portfolio-score-card">
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
        {/* Left: Circular Score */}
        <div className="flex flex-col items-center justify-center sm:min-w-[140px]">
          <CircularProgress value={scoreResult.totalScore} size={120} strokeWidth={10}>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold font-mono text-foreground leading-none">
                {scoreResult.totalScore}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">/ 100</span>
            </div>
          </CircularProgress>
          <Badge
            variant={gradeBadgeVariant(scoreResult.grade)}
            className="mt-2 text-sm font-bold px-3 py-0.5"
          >
            {scoreResult.grade} ランク
          </Badge>
        </div>

        {/* Right: Metric Bars */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-2">ポートフォリオスコア</h3>
          <p className="text-xs text-muted-foreground mb-3">{scoreResult.summary}</p>

          <div className="space-y-0">
            {freeMetrics.map((m) => (
              <MetricBar key={m.id} metric={m} />
            ))}
            {premiumMetrics.map((m) => (
              <MetricBar key={m.id} metric={m} locked={!isPremium} />
            ))}
          </div>

          {!isPremium && (
            <div className="mt-3 pt-3 border-t border-border">
              <a
                href="/pricing"
                className="inline-flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 transition-colors font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Standard プランで全8指標を解放
              </a>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default PortfolioScoreCard;
