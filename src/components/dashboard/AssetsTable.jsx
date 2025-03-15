import React from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const AssetsTable = () => {
  const { 
    currentAssets, 
    targetPortfolio, 
    baseCurrency, 
    totalAssets,
    exchangeRate
  } = usePortfolioContext();

  // 銘柄データとTarget配分を結合
  const mergedData = currentAssets.map(asset => {
    const target = targetPortfolio.find(t => t.id === asset.id);
    
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
    
    // 割合の計算
    const currentPercentage = totalAssets > 0 ? (assetValue / totalAssets) * 100 : 0;
    const targetPercentage = target ? target.targetPercentage : 0;
    const difference = targetPercentage - currentPercentage;
    
    return {
      ...asset,
      targetPercentage,
      currentPercentage,
      difference,
      assetValue
    };
  });

  // 評価額の降順でソート
  const sortedData = [...mergedData].sort((a, b) => b.assetValue - a.assetValue);

  if (sortedData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">保有資産詳細</h2>
        <p className="text-gray-500">保有資産が設定されていません。</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <h2 className="text-xl font-semibold p-6 pb-4">保有資産詳細</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                銘柄
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                価格
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                保有数
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                評価額
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                現在割合
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                目標割合
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                差分
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                年間手数料
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((asset) => (
              <tr key={asset.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {asset.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {asset.ticker}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(asset.price, asset.currency)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {asset.holdings.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(asset.assetValue, baseCurrency)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatPercent(asset.currentPercentage)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatPercent(asset.targetPercentage)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm ${
                    asset.difference > 0 ? 'text-green-600' : 
                    asset.difference < 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {asset.difference > 0 ? '+' : ''}
                    {formatPercent(asset.difference)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(asset.assetValue * (asset.annualFee / 100), baseCurrency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ({asset.annualFee}%)
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssetsTable;