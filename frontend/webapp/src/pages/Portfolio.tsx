/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/pages/Portfolio.tsx
 *
 * 作成者: Koki Riho （https://github.com/Rih0z）
 * 作成日: 2025-08-22 15:00:00
 *
 * 説明:
 * ポートフォリオの詳細表示と管理機能を提供するページコンポーネント。
 * テーマ対応UIで資産配分と詳細情報を表示。
 */

import React from 'react';
import { usePortfolioContext } from '../hooks/usePortfolioContext';
import AssetsTable from '../components/dashboard/AssetsTable';
import AllocationChart from '../components/dashboard/AllocationChart';
import PortfolioSummary from '../components/dashboard/PortfolioSummary';
import RebalanceRecommendations from '../components/dashboard/RebalanceRecommendations';

const Portfolio = () => {
  const { currentAssets, targetPortfolio, baseCurrency } = usePortfolioContext();

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Page Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-success-500/10 rounded-xl">
              <svg className="w-8 h-8 text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground">ポートフォリオ詳細</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            現在の資産状況、配分、リバランス推奨を詳細に確認
          </p>
        </div>

        {/* Portfolio Summary */}
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">ポートフォリオサマリー</h2>
              <p className="text-muted-foreground text-sm">全体的な資産状況の概要</p>
            </div>
          </div>
          <PortfolioSummary />
        </div>

        {/* Allocation Chart */}
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-warning-500/10 rounded-lg">
              <svg className="w-6 h-6 text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">資産配分チャート</h2>
              <p className="text-muted-foreground text-sm">現在の配分と目標配分の比較</p>
            </div>
          </div>
          <AllocationChart />
        </div>

        {/* Rebalance Recommendations */}
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-info-500/10 rounded-lg">
              <svg className="w-6 h-6 text-info-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">リバランス推奨</h2>
              <p className="text-muted-foreground text-sm">目標配分に近づけるための推奨アクション</p>
            </div>
          </div>
          <RebalanceRecommendations />
        </div>

        {/* Assets Table */}
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-success-500/10 rounded-lg">
              <svg className="w-6 h-6 text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">保有資産詳細</h2>
              <p className="text-muted-foreground text-sm">すべての資産の詳細情報と状況</p>
            </div>
          </div>
          <AssetsTable />
        </div>

        {/* Data Status */}
        {currentAssets.length === 0 && (
          <div className="bg-muted/30 border border-border rounded-xl p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-muted rounded-full">
                <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">データが登録されていません</h3>
                <p className="text-muted-foreground/70 text-sm mb-4">
                  設定ページで資産情報を登録するか、データインポート機能をご利用ください
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href="/settings"
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    設定ページへ
                  </a>
                  <a
                    href="/data"
                    className="px-4 py-2 bg-accent text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    データインポート
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Portfolio;
