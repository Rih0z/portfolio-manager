import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const DifferenceChart = () => {
  const { currentAssets, targetPortfolio, baseCurrency, totalAssets, exchangeRate } = usePortfolioContext();

  // 差分データの計算
  const calculateDifferenceData = () => {
    // 現在割合の計算
    const currentPercentages = {};
    
    currentAssets.forEach(asset => {
      // 資産額の計算（通貨換算を考慮）
      let assetValue = asset.price * asset.holdings;
      
      if (asset.currency !== baseCurrency) {
        // 通貨換算
        if (baseCurrency === 'JPY' && asset.currency === 'USD') {
          assetValue *= exchangeRate.rate || 150; // 固定レート（実際には動的レートを使用）
        } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
          assetValue /= exchangeRate.rate || 150;
        }
      }
      
      const percentage = totalAssets > 0 ? (assetValue / totalAssets) * 100 : 0;
      currentPercentages[asset.id] = percentage;
    });
    
    // 目標割合を取得
    const targetPercentages = {};
    targetPortfolio.forEach(item => {
      targetPercentages[item.id] = item.targetPercentage;
    });
    
    // 差分の計算
    const differenceData = targetPortfolio.map(item => {
      const currentPct = currentPercentages[item.id] || 0;
      const targetPct = targetPercentages[item.id] || 0;
      const difference = targetPct - currentPct;
      
      return {
        name: item.name,
        ticker: item.ticker,
        difference: parseFloat(difference.toFixed(2))
      };
    });
    
    // 差分の絶対値でソート
    return differenceData.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  };

  const differenceData = calculateDifferenceData();

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm text-sm">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className="text-gray-700">
            {payload[0].payload.ticker}: {payload[0].value > 0 ? '+' : ''}{payload[0].value}%
          </p>
        </div>
      );
    }
    return null;
  };

  // 表示するデータがない場合
  if (differenceData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6 text-center">
        <h2 className="text-xl font-semibold mb-2">ポートフォリオ差分</h2>
        <p className="text-gray-500">表示するデータがありません。目標配分を設定してください。</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">ポートフォリオ差分</h2>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={differenceData}
          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="ticker" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            label={{ 
              value: '差分 (パーセントポイント)', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="difference" 
            fill={(entry) => entry.difference > 0 ? '#4CAF50' : '#F44336'} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DifferenceChart;