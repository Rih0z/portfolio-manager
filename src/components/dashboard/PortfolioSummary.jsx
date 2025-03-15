import React from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const PortfolioSummary = () => {
  const { 
    baseCurrency, 
    totalAssets, 
    annualFees, 
    currentAssets,
    targetPortfolio 
  } = usePortfolioContext();

  // 銘柄数の計算
  const tickerCount = currentAssets.length;
  
  // 年間手数料率（総資産に対する割合）
  const feePercentage = totalAssets > 0 ? (annualFees / totalAssets) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">ポートフォリオサマリー</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">総資産</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(totalAssets, baseCurrency)}
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">設定銘柄数</p>
          <p className="text-2xl font-bold text-gray-700">{tickerCount}</p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">年間手数料（推定）</p>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(annualFees, baseCurrency)}
            </p>
            <p className="text-sm text-gray-500">
              （総資産の{formatPercent(feePercentage, 2)}）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSummary;