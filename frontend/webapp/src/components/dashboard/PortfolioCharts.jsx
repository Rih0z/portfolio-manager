/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/dashboard/PortfolioCharts.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * ポートフォリオの現在配分と理想配分を円グラフで表示するコンポーネント。
 * 左右に並べて表示することで、現在と理想の資産配分の違いを視覚的に比較できる。
 * recharts ライブラリを使用して実装。
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const PortfolioCharts = () => {
  const { currentAssets, targetPortfolio, baseCurrency, totalAssets, exchangeRate } = usePortfolioContext();

  // デバッグログ
  console.log('PortfolioCharts Debug:', {
    currentAssets,
    targetPortfolio,
    totalAssets,
    baseCurrency,
    exchangeRate
  });

  // 理想ポートフォリオデータ生成（targetPercentage > 0 のもののみ）
  const targetData = targetPortfolio
    .filter(item => item.targetPercentage > 0)
    .map(item => ({
      name: item.name,
      value: item.targetPercentage,
      ticker: item.ticker
    }));

  // 現在ポートフォリオデータ生成
  const currentData = [];
  
  if (totalAssets > 0) {
    currentAssets.forEach(asset => {
      // 資産額の計算（通貨換算を考慮）
      let assetValue = asset.price * asset.holdings;
      
      if (asset.currency !== baseCurrency) {
        // 通貨換算
        if (baseCurrency === 'JPY' && asset.currency === 'USD') {
          assetValue *= exchangeRate.rate;
        } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
          assetValue /= exchangeRate.rate;
        }
      }
      
      // 0以上の場合のみ追加
      if (assetValue > 0) {
        const percentage = (assetValue / totalAssets) * 100;
        currentData.push({
          name: asset.name,
          value: percentage,
          ticker: asset.ticker
        });
      }
    });
  }

  // デバッグログ：現在のデータ
  console.log('Current portfolio data:', {
    currentData,
    totalAssets,
    currentAssetsLength: currentAssets.length
  });

  // チャート用カラーパレット
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#FF6B6B', '#6C5CE7', '#FFA502', '#2ED573',
    '#1E90FF', '#FF7F50', '#32CD32', '#FF00FF', '#FFD700'
  ];

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-300 border border-dark-400 p-3 rounded-lg shadow-lg text-sm">
          <p className="font-medium text-white">{payload[0].payload.name}</p>
          <p className="text-gray-300">
            {payload[0].payload.ticker}: {payload[0].value.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-dark-200 rounded-lg shadow-xl p-6 mb-6 border border-dark-400">
      <h2 className="text-xl font-semibold mb-4 text-white">ポートフォリオ配分</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-center text-lg font-medium mb-4 text-gray-200">理想配分</h3>
          {targetData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={targetData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={1}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value.toFixed(1)}%)`}
                  labelLine={false}
                >
                  {targetData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="mb-2">理想配分データがありません</p>
                <p className="text-sm">設定タブから目標配分を設定してください</p>
              </div>
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-center text-lg font-medium mb-4 text-gray-200">現在配分</h3>
          {currentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={currentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={1}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value.toFixed(1)}%)`}
                  labelLine={false}
                >
                  {currentData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="mb-2">現在の保有資産データがありません</p>
                <p className="text-sm">設定タブから保有資産を登録してください</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioCharts;
