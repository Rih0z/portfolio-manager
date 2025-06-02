/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/pages/Dashboard.jsx
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

import React from 'react';
import { useTranslation } from 'react-i18next';
import PortfolioSummary from '../components/dashboard/PortfolioSummary';
import PortfolioCharts from '../components/dashboard/PortfolioCharts';
import DifferenceChart from '../components/dashboard/DifferenceChart';
import AssetsTable from '../components/dashboard/AssetsTable';
import DataStatusBar from '../components/layout/DataStatusBar';
import ModernCard from '../components/common/ModernCard';
import ModernButton from '../components/common/ModernButton';
import { usePortfolioContext } from '../hooks/usePortfolioContext';

const Dashboard = () => {
  const { t } = useTranslation();
  const { currentAssets } = usePortfolioContext();
  
  // データがない場合の表示
  if (currentAssets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ModernCard className="max-w-lg text-center" gradient={true}>
          <div className="p-8">
            {/* Empty state illustration */}
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            
            <ModernCard.Title size="xl" className="mb-4">
              {t('dashboard.noPortfolio')}
            </ModernCard.Title>
            
            <p className="text-secondary-600 mb-8 leading-relaxed">
              {t('dashboard.setupInstructions')}
            </p>
            
            <ModernButton
              size="lg"
              onClick={() => window.location.href = '/settings'}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              }
              iconPosition="right"
            >
              {t('dashboard.goToSettings')}
            </ModernButton>
          </div>
        </ModernCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <DataStatusBar />
      
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-2">
          {t('dashboard.title')}
        </h1>
        <p className="text-secondary-600">
          Portfolio performance and analytics overview
        </p>
      </div>
      
      <PortfolioSummary />
      <PortfolioCharts />
      <DifferenceChart />
      <AssetsTable />
    </div>
  );
};

export default Dashboard;
