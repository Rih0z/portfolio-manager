/**
 * MonthlyReportCard
 *
 * 月次投資レポートのサマリーカード。
 * 月間リターン、トップ銘柄、スコア変化を表示する。
 *
 * @file src/components/reports/MonthlyReportCard.tsx
 */
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import type { MonthlyReport } from '../../utils/monthlyReport';

interface MonthlyReportCardProps {
  report: MonthlyReport;
  baseCurrency: string;
}

const formatCurrency = (value: number, currency: string): string => {
  const prefix = value >= 0 ? '+' : '';
  if (currency === 'JPY') {
    return `${prefix}¥${Math.abs(Math.round(value)).toLocaleString()}`;
  }
  return `${prefix}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
};

const MonthlyReportCard: React.FC<MonthlyReportCardProps> = ({
  report,
  baseCurrency,
}) => {
  const [year, monthNum] = report.month.split('-').map(Number);
  const isPositive = report.monthlyReturn > 0;
  const isNegative = report.monthlyReturn < 0;
  const returnSign = report.monthlyReturnPercent >= 0 ? '+' : '';

  return (
    <Card data-testid="monthly-report-card" padding="medium">
      <CardHeader>
        <CardTitle className="text-base">
          {year}年{monthNum}月 レポート
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monthly Return */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">月間リターン</span>
          <div
            data-testid="monthly-return"
            className={`font-mono font-semibold text-lg ${
              isPositive ? 'text-success-600' :
              isNegative ? 'text-danger-600' :
              'text-foreground'
            }`}
          >
            {formatCurrency(report.monthlyReturn, baseCurrency)}
            <span className="text-sm ml-1">
              ({returnSign}{report.monthlyReturnPercent}%)
            </span>
          </div>
        </div>

        {/* Holdings count */}
        <div data-testid="holdings-count" className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">保有銘柄</span>
          <span className="font-semibold">{report.holdingsCount}件</span>
        </div>

        {/* Score Change */}
        {report.scoreChange !== 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">スコア変化</span>
            <Badge
              data-testid="score-change"
              variant={report.scoreChange > 0 ? 'success' : 'danger'}
                         >
              {report.scoreChange > 0 ? '+' : ''}{report.scoreChange}pt
            </Badge>
          </div>
        )}

        {/* Top Gainers */}
        {report.topGainers.length > 0 && (
          <div data-testid="top-gainers" className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">上昇銘柄</p>
            <div className="flex flex-wrap gap-2">
              {report.topGainers.map((g) => (
                <Badge key={g.ticker} variant="success">
                  {g.ticker} +{g.pnlPercent.toFixed(1)}%
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top Losers */}
        {report.topLosers.length > 0 && (
          <div data-testid="top-losers" className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">下落銘柄</p>
            <div className="flex flex-wrap gap-2">
              {report.topLosers.map((l) => (
                <Badge key={l.ticker} variant="danger">
                  {l.ticker} {l.pnlPercent.toFixed(1)}%
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default React.memo(MonthlyReportCard);
