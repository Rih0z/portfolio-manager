import React from 'react';
import PortfolioSummary from '../components/dashboard/PortfolioSummary';
import PortfolioCharts from '../components/dashboard/PortfolioCharts';
import DifferenceChart from '../components/dashboard/DifferenceChart';
import AssetsTable from '../components/dashboard/AssetsTable';
import DataStatusBar from '../components/layout/DataStatusBar';
import { usePortfolioContext } from '../hooks/usePortfolioContext';

const Dashboard = () => {
  const { currentAssets } = usePortfolioContext();
  
  // データがない場合の表示
  if (currentAssets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">ポートフォリオが設定されていません</h2>
        <p className="text-gray-600 mb-6">
          「設定」タブから銘柄を追加して、保有資産と目標配分を設定してください。
        </p>
        <a 
          href="/settings" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded"
        >
          設定画面へ
        </a>
      </div>
    );
  }

  return (
    <div>
      <DataStatusBar />
      <PortfolioSummary />
      <PortfolioCharts />
      <DifferenceChart />
      <AssetsTable />
    </div>
  );
};

export default Dashboard;