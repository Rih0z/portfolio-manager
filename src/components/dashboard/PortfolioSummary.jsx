import React from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const PortfolioSummary = () => {
  const { 
    baseCurrency, 
    totalAssets, 
    annualFees, 
    annualDividends, // 年間配当金を追加
    currentAssets,
    targetPortfolio 
  } = usePortfolioContext();

  // 銘柄数の計算
  const tickerCount = currentAssets.length;
  
  // 年間手数料率（総資産に対する割合）
  const feePercentage = totalAssets > 0 ? (annualFees / totalAssets) * 100 : 0;
  
  // 年間配当利回り（総資産に対する割合）
  const dividendYieldPercentage = totalAssets > 0 ? (annualDividends / totalAssets) * 100 : 0;

  // 最高手数料率と最低手数料率の銘柄を取得
  const assetsWithFees = currentAssets.filter(asset => asset.holdings > 0);
  
  let highestFeeAsset = null;
  let lowestFeeAsset = null;
  
  if (assetsWithFees.length > 0) {
    highestFeeAsset = assetsWithFees.reduce((max, asset) => 
      (asset.annualFee || 0) > (max.annualFee || 0) ? asset : max, assetsWithFees[0]);
      
    lowestFeeAsset = assetsWithFees.reduce((min, asset) => 
      (asset.annualFee || 0) < (min.annualFee || 0) ? asset : min, assetsWithFees[0]);
  }
  
  // 高配当銘柄を取得
  let highestDividendAsset = null;
  
  if (assetsWithFees.length > 0) {
    // 配当がある銘柄のみをフィルタリング
    const assetsWithDividends = assetsWithFees.filter(asset => 
      asset.hasDividend && asset.dividendYield > 0);
      
    if (assetsWithDividends.length > 0) {
      highestDividendAsset = assetsWithDividends.reduce((max, asset) => 
        (asset.dividendYield || 0) > (max.dividendYield || 0) ? asset : max, 
        assetsWithDividends[0]);
    }
  }

  // ファンドタイプごとの集計
  const fundTypeSummary = assetsWithFees.reduce((acc, asset) => {
    const fundType = asset.fundType || '不明';
    if (!acc[fundType]) {
      acc[fundType] = {
        totalValue: 0,
        totalFee: 0,
        totalDividend: 0,
        count: 0,
      };
    }
    
    let assetValue = asset.price * asset.holdings;
    if (asset.currency !== baseCurrency) {
      if (baseCurrency === 'JPY' && asset.currency === 'USD') {
        assetValue *= 150; // 固定レート
      } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
        assetValue /= 150;
      }
    }
    
    acc[fundType].totalValue += assetValue;
    acc[fundType].totalFee += (assetValue * (asset.annualFee || 0) / 100);
    
    // 配当情報も集計
    if (asset.hasDividend) {
      acc[fundType].totalDividend += (assetValue * (asset.dividendYield || 0) / 100);
    }
    
    acc[fundType].count += 1;
    
    return acc;
  }, {});
  
  // 手数料が高いファンドタイプ上位3つを取得
  const topFeeTypes = Object.entries(fundTypeSummary)
    .map(([type, data]) => ({
      type,
      avgFeeRate: data.totalValue > 0 ? (data.totalFee / data.totalValue) * 100 : 0,
      totalValue: data.totalValue,
      totalFee: data.totalFee,
      count: data.count
    }))
    .sort((a, b) => b.totalFee - a.totalFee)
    .slice(0, 3);
    
  // 配当金が高いファンドタイプ上位3つを取得
  const topDividendTypes = Object.entries(fundTypeSummary)
    .filter(([_, data]) => data.totalDividend > 0) // 配当があるものだけ
    .map(([type, data]) => ({
      type,
      avgDividendRate: data.totalValue > 0 ? (data.totalDividend / data.totalValue) * 100 : 0,
      totalValue: data.totalValue,
      totalDividend: data.totalDividend,
      count: data.count
    }))
    .sort((a, b) => b.totalDividend - a.totalDividend)
    .slice(0, 3);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">ポートフォリオサマリー</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
        
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">年間配当金（推定）</p>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(annualDividends, baseCurrency)}
            </p>
            <p className="text-sm text-gray-500">
              （配当利回り{formatPercent(dividendYieldPercentage, 2)}）
            </p>
          </div>
        </div>
      </div>
      
      {/* 手数料と配当の詳細セクション */}
      {assetsWithFees.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">手数料と配当詳細</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {highestFeeAsset && (
              <div className="p-3 border border-red-200 rounded-lg">
                <p className="text-sm font-medium">最も高い手数料率の銘柄:</p>
                <p className="text-base">
                  <span className="font-semibold">{highestFeeAsset.name}</span>
                  <span className="ml-2 text-red-600 font-bold">
                    {formatPercent(highestFeeAsset.annualFee || 0, 2)}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  年間手数料: {formatCurrency((highestFeeAsset.price * highestFeeAsset.holdings * (highestFeeAsset.annualFee || 0) / 100), highestFeeAsset.currency)}
                </p>
                {highestFeeAsset.fundType && (
                  <p className="text-xs mt-1">
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      {highestFeeAsset.fundType}
                    </span>
                  </p>
                )}
              </div>
            )}
            
            {lowestFeeAsset && lowestFeeAsset.annualFee > 0 && (
              <div className="p-3 border border-green-200 rounded-lg">
                <p className="text-sm font-medium">最も低い手数料率の銘柄:</p>
                <p className="text-base">
                  <span className="font-semibold">{lowestFeeAsset.name}</span>
                  <span className="ml-2 text-green-600 font-bold">
                    {formatPercent(lowestFeeAsset.annualFee || 0, 2)}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  年間手数料: {formatCurrency((lowestFeeAsset.price * lowestFeeAsset.holdings * (lowestFeeAsset.annualFee || 0) / 100), lowestFeeAsset.currency)}
                </p>
                {lowestFeeAsset.fundType && (
                  <p className="text-xs mt-1">
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      {lowestFeeAsset.fundType}
                    </span>
                  </p>
                )}
              </div>
            )}
            
            {highestDividendAsset && (
              <div className="p-3 border border-green-200 rounded-lg">
                <p className="text-sm font-medium">最も高い配当利回りの銘柄:</p>
                <p className="text-base">
                  <span className="font-semibold">{highestDividendAsset.name}</span>
                  <span className="ml-2 text-green-600 font-bold">
                    {formatPercent(highestDividendAsset.dividendYield || 0, 2)}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  年間配当金: {formatCurrency((highestDividendAsset.price * highestDividendAsset.holdings * (highestDividendAsset.dividendYield || 0) / 100), highestDividendAsset.currency)}
                </p>
                {highestDividendAsset.dividendFrequency && (
                  <p className="text-xs mt-1">
                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      {highestDividendAsset.dividendFrequency === 'monthly' ? '毎月分配' :
                       highestDividendAsset.dividendFrequency === 'quarterly' ? '四半期分配' :
                       highestDividendAsset.dividendFrequency === 'semi-annual' ? '半年分配' :
                       highestDividendAsset.dividendFrequency === 'annual' ? '年1回分配' : '配当あり'}
                    </span>
                    {highestDividendAsset.dividendIsEstimated && (
                      <span className="ml-1 bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                        推定値
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* ファンドタイプごとの手数料 */}
          {topFeeTypes.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">ファンドタイプ別年間手数料（上位3種類）</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {topFeeTypes.map(type => (
                  <div key={type.type} className="bg-white p-3 rounded border">
                    <p className="font-medium text-sm">{type.type}</p>
                    <p className="text-xs text-gray-500">銘柄数: {type.count}</p>
                    <p className="text-sm mt-1">
                      <span className="text-red-600 font-medium">
                        {formatCurrency(type.totalFee, baseCurrency)}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        ({formatPercent(type.avgFeeRate, 2)}相当)
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* ファンドタイプごとの配当 */}
          {topDividendTypes.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">ファンドタイプ別年間配当金（上位3種類）</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {topDividendTypes.map(type => (
                  <div key={type.type} className="bg-white p-3 rounded border">
                    <p className="font-medium text-sm">{type.type}</p>
                    <p className="text-xs text-gray-500">銘柄数: {type.count}</p>
                    <p className="text-sm mt-1">
                      <span className="text-green-600 font-medium">
                        {formatCurrency(type.totalDividend, baseCurrency)}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        (利回り{formatPercent(type.avgDividendRate, 2)})
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-600">
            <p>
              手数料は各銘柄の現在の保有額と設定された年間手数料率に基づいて計算されています。
              配当金は各銘柄の現在の保有額と推定配当利回りに基づいて計算されています。
              より正確な情報は各金融機関やファンドの最新の資料を参照してください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioSummary;
