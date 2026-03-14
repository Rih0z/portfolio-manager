/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/pages/Dashboard.tsx
 *
 * 作成者: Koki Riho （https://github.com/Rih0z）
 * 作成日: 2025-03-20 14:30:15
 *
 * 更新履歴:
 * - 2025-03-20 14:30:15 Koki Riho 初回作成
 * - 2025-04-10 09:45:22 Koki Riho データ読み込み状態の表示を追加
 * - 2025-05-01 16:20:30 Yuta Sato 空の状態のUI改善
 *
 * 説明:
 * ポートフォリオのダッシュボード画面を表示するメインページコンポーネント。
 * ポートフォリオのサマリー、チャート、資産配分と差異、保有銘柄テーブルを表示する。
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, PlusCircle } from 'lucide-react';
import PortfolioSummary from '../components/dashboard/PortfolioSummary';
import PortfolioCharts from '../components/dashboard/PortfolioCharts';
import DifferenceChart from '../components/dashboard/DifferenceChart';
import AssetsTable from '../components/dashboard/AssetsTable';
import PortfolioScoreCard from '../components/dashboard/PortfolioScoreCard';
import PnLSummary from '../components/dashboard/PnLSummary';
import PnLTrendChart from '../components/dashboard/PnLTrendChart';
import StrengthsWeaknessCard from '../components/ai/StrengthsWeaknessCard';
import GoalProgressSection from '../components/goals/GoalProgressSection';
import DataStatusBar from '../components/layout/DataStatusBar';
import { usePortfolioContext } from '../hooks/usePortfolioContext';
import { useIsPremium } from '../hooks/queries';
import { enrichPortfolioData } from '../utils/portfolioDataEnricher';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { trackEvent, AnalyticsEvents } from '../utils/analytics';
import SEOHead from '../components/seo/SEOHead';
import NPSSurvey from '../components/survey/NPSSurvey';
import StreakBadge from '../components/dashboard/StreakBadge';
import ScoreChangeIndicator from '../components/dashboard/ScoreChangeIndicator';
import DividendForecast from '../components/dashboard/DividendForecast';
import WeeklyRebalanceCard from '../components/dashboard/WeeklyRebalanceCard';
import { useEngagementStore } from '../stores/engagementStore';
import { Badge } from '../components/ui/badge';

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentAssets, targetPortfolio, baseCurrency, exchangeRate } = usePortfolioContext();
  const isPremium = useIsPremium();
  const isInTrialPeriod = useEngagementStore(s => s.isInTrialPeriod);
  const getTrialDaysRemaining = useEngagementStore(s => s.getTrialDaysRemaining);

  React.useEffect(() => {
    trackEvent(AnalyticsEvents.DASHBOARD_VIEW);
  }, []);

  const enrichedData = useMemo(() => {
    if (currentAssets.length === 0) return null;
    return enrichPortfolioData(
      currentAssets,
      targetPortfolio,
      isPremium,
      baseCurrency,
      exchangeRate?.rate || 150
    );
  }, [currentAssets, targetPortfolio, isPremium, baseCurrency, exchangeRate]);

  if (currentAssets.length === 0) {
    return (
      <>
      <SEOHead />
      <div className="min-h-[calc(100vh-8rem)] sm:min-h-[calc(100vh-6rem)] flex items-center justify-center p-4 px-3 sm:px-4">
        <Card elevation="medium" padding="large" className="max-w-lg text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 relative">
            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-lg"></div>
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 border border-primary-300 dark:border-primary-700 rounded-full flex items-center justify-center shadow-sm">
              <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-primary-600 dark:text-primary-400" />
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
            ポートフォリオを始めましょう
          </h2>

          <p className="text-muted-foreground mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
            証券口座のCSVをインポートするか、銘柄を手動で追加できます。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="large"
              onClick={() => navigate('/data-import')}
              icon={<Upload size={18} />}
              iconPosition="left"
              fullWidth={false}
            >
              CSVインポート
            </Button>
            <Button
              variant="outline"
              size="large"
              onClick={() => navigate('/settings')}
              icon={<PlusCircle size={18} />}
              iconPosition="left"
              fullWidth={false}
            >
              手動で追加
            </Button>
          </div>
        </Card>
      </div>
      </>
    );
  }

  return (
    <>
    <SEOHead />
    <div data-testid="dashboard-page" className="space-y-4 sm:space-y-6 animate-fade-in px-3 sm:px-4 lg:px-6 pb-20 sm:pb-6">
      <DataStatusBar />

      {/* Score Change Notifications */}
      <ScoreChangeIndicator />

      {/* Welcome Section + Streak */}
      <div className="mb-4 sm:mb-8 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent mb-2 leading-tight">
              ポートフォリオダッシュボード
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              資産配分・損益・スコアの全体概要
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isPremium && isInTrialPeriod() && (
              <Badge variant="default" data-testid="trial-badge" className="font-mono tabular-nums">
                トライアル残り {getTrialDaysRemaining()}日
              </Badge>
            )}
            <StreakBadge />
          </div>
        </div>
      </div>

      {/* Hero: PnL Summary - Full Width */}
      <PnLSummary />

      {/* Main Grid - 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: Key Metrics */}
        <div className="space-y-4 sm:space-y-6">
          {enrichedData && (
            <StrengthsWeaknessCard enrichedData={enrichedData} />
          )}
          <PortfolioScoreCard />
          <DividendForecast />
        </div>

        {/* Right Column: Charts & Goals */}
        <div className="space-y-4 sm:space-y-6">
          <GoalProgressSection
            totalValue={enrichedData?.holdings?.totalValue || 0}
            baseCurrency={baseCurrency}
          />
          <WeeklyRebalanceCard />
          <PortfolioSummary />
          <PortfolioCharts />
        </div>
      </div>

      {/* Full-width section below grid */}
      <div className="space-y-4 sm:space-y-6">
        <PnLTrendChart />
        <DifferenceChart />
        <AssetsTable />
      </div>

      {/* NPS Survey */}
      <NPSSurvey />
    </div>
    </>
  );
};

export default Dashboard;
