/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/dashboard/AssetsTable.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * 保有資産の詳細テーブルコンポーネント。
 * 各銘柄の名前、価格、保有数、評価額、現在割合、目標割合、差分、手数料、配当情報などを
 * 表形式で表示する。バッジによる銘柄タイプやデータソースの視覚化も行う。
 */

import React from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import DataSourceBadge from '../common/DataSourceBadge';

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
        assetValue *= exchangeRate.rate;
      } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
        assetValue /= exchangeRate.rate;
      }
    }
    
    // 割合の計算
    const currentPercentage = totalAssets > 0 ? (assetValue / totalAssets) * 100 : 0;
    const targetPercentage = target ? target.targetPercentage : 0;
    const difference = targetPercentage - currentPercentage;
    
    // 年間配当金の計算
    const annualDividend = asset.hasDividend ? (assetValue * (asset.dividendYield || 0) / 100) : 0;
    
    return {
      ...asset,
      targetPercentage,
      currentPercentage,
      difference,
      assetValue,
      annualDividend
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

  // 配当頻度の表示変換
  const formatDividendFrequency = (frequency) => {
    switch (frequency) {
      case 'monthly': return '毎月';
      case 'quarterly': return '四半期';
      case 'semi-annual': return '半年';
      case 'annual': return '年1回';
      default: return '不明';
    }
  };

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
                手数料
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                配当
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
                      {/* ファンドタイプバッジを表示 */}
                      <div className="mt-1 space-x-1 flex flex-wrap gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          asset.isStock 
                            ? 'bg-gray-100 text-gray-800' 
                            : asset.isMutualFund
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {asset.fundType}
                        </span>
                        
                        {/* データソースバッジ */}
                        {asset.source && <DataSourceBadge source={asset.source} />}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(asset.price, asset.currency)}
                  </div>
                  {/* 投資信託の場合は「基準価額」と表示 */}
                  {asset.isMutualFund && (
                    <div className="text-xs text-gray-500">
                      (基準価額)
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {asset.holdings.toLocaleString(undefined, {maximumFractionDigits: 4})}
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
                  {/* 手数料情報源バッジ */}
                  {asset.feeSource && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      asset.feeSource === '個別株'
                        ? 'bg-gray-100 text-gray-800'
                        : asset.feeSource === '投資信託'
                          ? 'bg-indigo-100 text-indigo-800'
                          : asset.feeIsEstimated 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                    }`}>
                      {asset.feeSource}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {asset.hasDividend ? (
                    <div>
                      <div className="text-sm text-green-600">
                        {formatCurrency(asset.annualDividend, baseCurrency)}
                      </div>
                      <div className="text-xs text-gray-500">
                        ({formatPercent(asset.dividendYield, 2)})
                      </div>
                      {/* 配当頻度バッジ */}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        asset.dividendIsEstimated
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {formatDividendFrequency(asset.dividendFrequency)}
                        {asset.dividendIsEstimated ? '（推定）' : ''}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">なし</div>
                  )}
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
