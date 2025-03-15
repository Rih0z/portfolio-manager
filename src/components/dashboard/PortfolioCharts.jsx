import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const PortfolioCharts = () => {
  const { currentAssets, targetPortfolio, baseCurrency, totalAssets, exchangeRate } = usePortfolioContext();

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
          assetValue *= exchangeRate.rate || 150; // 為替レートまたはデフォルト値
        } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
          assetValue /= exchangeRate.rate || 150;
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
        <div className="bg-white p-2 border border-gray-200 shadow-sm text-sm">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className="text-gray-700">
            {payload[0].payload.ticker}: {payload[0].value.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">ポートフォリオ配分</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-center text-lg font-medium mb-4">理想配分</h3>
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
        </div>
        
        <div>
          <h3 className="text-center text-lg font-medium mb-4">現在配分</h3>
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
        </div>
      </div>
    </div>
  );
};

export default PortfolioCharts;