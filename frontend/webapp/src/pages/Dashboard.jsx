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
      <div className="min-h-[calc(100vh-8rem)] sm:min-h-[calc(100vh-6rem)] flex items-center justify-center p-4 px-3 sm:px-4">
        <div className="w-full max-w-lg text-center bg-dark-200 border border-dark-400 rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* Empty state illustration */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 relative">
            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-lg"></div>
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-dark-300 border border-dark-400 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-lg sm:text-xl font-bold text-gray-100 mb-3 sm:mb-4">
            {t('dashboard.noPortfolio')}
          </h2>
          
          <p className="text-gray-300 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
            {t('dashboard.setupInstructions')}
          </p>
          
          <button
            onClick={() => window.location.href = '/settings'}
            className="w-full sm:w-auto bg-primary-500 text-white px-6 py-3 rounded-xl hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-dark-200 transition-all duration-200 font-medium shadow-lg hover:shadow-glow inline-flex items-center justify-center space-x-2"
          >
            <span>{t('dashboard.goToSettings')}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in px-3 sm:px-4 lg:px-6 pb-20 sm:pb-6">
      <DataStatusBar />
      
      {/* Welcome Section */}
      <div className="mb-4 sm:mb-8 pt-2">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary-400 to-primary-500 bg-clip-text text-transparent mb-2 leading-tight">
          {t('dashboard.title')}
        </h1>
        <p className="text-gray-300 text-sm sm:text-base">
          Portfolio performance and analytics overview
        </p>
      </div>
      
      {/* Dashboard Components with responsive spacing */}
      <div className="space-y-4 sm:space-y-6">
        <PortfolioSummary />
        <PortfolioCharts />
        <DifferenceChart />
        <AssetsTable />
      </div>
    </div>
  );
};

export default Dashboard;
