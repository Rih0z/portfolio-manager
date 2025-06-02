/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/dashboard/PortfolioSummary.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * ポートフォリオの概要情報を表示するコンポーネント。
 * 総資産、設定銘柄数、年間手数料、年間配当金などの主要指標を表示する。
 * また、手数料や配当に関する詳細情報やファンドタイプ別の集計情報も提供する。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import ModernCard from '../common/ModernCard';

const PortfolioSummary = () => {
  const { t } = useTranslation();
  const { 
    baseCurrency, 
    totalAssets, 
    annualFees, 
    annualDividends, // 年間配当金を追加
    currentAssets,
    targetPortfolio,
    exchangeRate 
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
        assetValue *= exchangeRate.rate;
      } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
        assetValue /= exchangeRate.rate;
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

  const statsData = [
    {
      label: t('dashboard.totalAssets'),
      value: totalAssets,
      format: 'currency',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: 'primary'
    },
    {
      label: '設定銘柄数',
      value: tickerCount,
      format: 'number',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'secondary'
    },
    {
      label: '年間手数料（推定）',
      value: annualFees,
      format: 'currency',
      subtitle: `総資産の${formatPercent(feePercentage, 2)}`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      ),
      color: 'danger'
    },
    {
      label: '年間配当金（推定）',
      value: annualDividends,
      format: 'currency',
      subtitle: `配当利回り${formatPercent(dividendYieldPercentage, 2)}`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
        </svg>
      ),
      color: 'success'
    }
  ];

  return (
    <div className="space-y-6">
      <ModernCard>
        <ModernCard.Header>
          <ModernCard.Title size="xl">
            Portfolio Summary
          </ModernCard.Title>
        </ModernCard.Header>
        
        <ModernCard.Content>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsData.map((stat, index) => (
              <ModernCard 
                key={index}
                className="p-4"
                gradient={true}
                hover={false}
              >
                <div className="flex items-center justify-between mb-3">
                  <ModernCard.Icon icon={stat.icon} color={stat.color} />
                </div>
                
                <div>
                  <p className="text-sm font-medium text-secondary-600 mb-1">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-secondary-900 mb-1">
                    {stat.format === 'currency' 
                      ? formatCurrency(stat.value, baseCurrency)
                      : stat.value?.toLocaleString()
                    }
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-secondary-500">
                      {stat.subtitle}
                    </p>
                  )}
                </div>
              </ModernCard>
            ))}
          </div>
        </ModernCard.Content>
      </ModernCard>
      
      {/* 手数料と配当の詳細セクション */}
      {assetsWithFees.length > 0 && (
        <ModernCard>
          <ModernCard.Header>
            <ModernCard.Title>手数料と配当詳細</ModernCard.Title>
          </ModernCard.Header>
          
          <ModernCard.Content>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {highestFeeAsset && (
              <ModernCard className="p-4 border-l-4 border-l-danger-500">
                <div className="flex items-start justify-between mb-2">
                  <ModernCard.Icon 
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    } 
                    color="danger" 
                    className="mt-1"
                  />
                </div>
                <h4 className="text-sm font-semibold text-secondary-900 mb-2">
                  最も高い手数料率の銘柄
                </h4>
                <p className="text-base font-bold text-secondary-900 mb-1">
                  {highestFeeAsset.name}
                </p>
                <p className="text-lg font-bold text-danger-600 mb-2">
                  {formatPercent(highestFeeAsset.annualFee || 0, 2)}
                </p>
                <p className="text-xs text-secondary-500 mb-2">
                  年間手数料: {formatCurrency((highestFeeAsset.price * highestFeeAsset.holdings * (highestFeeAsset.annualFee || 0) / 100), highestFeeAsset.currency)}
                </p>
                {highestFeeAsset.fundType && (
                  <span className="inline-block bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs font-medium">
                    {highestFeeAsset.fundType}
                  </span>
                )}
              </ModernCard>
            )}
            
            {lowestFeeAsset && lowestFeeAsset.annualFee > 0 && (
              <ModernCard className="p-4 border-l-4 border-l-success-500">
                <div className="flex items-start justify-between mb-2">
                  <ModernCard.Icon 
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    } 
                    color="success" 
                    className="mt-1"
                  />
                </div>
                <h4 className="text-sm font-semibold text-secondary-900 mb-2">
                  最も低い手数料率の銘柄
                </h4>
                <p className="text-base font-bold text-secondary-900 mb-1">
                  {lowestFeeAsset.name}
                </p>
                <p className="text-lg font-bold text-success-600 mb-2">
                  {formatPercent(lowestFeeAsset.annualFee || 0, 2)}
                </p>
                <p className="text-xs text-secondary-500 mb-2">
                  年間手数料: {formatCurrency((lowestFeeAsset.price * lowestFeeAsset.holdings * (lowestFeeAsset.annualFee || 0) / 100), lowestFeeAsset.currency)}
                </p>
                {lowestFeeAsset.fundType && (
                  <span className="inline-block bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs font-medium">
                    {lowestFeeAsset.fundType}
                  </span>
                )}
              </ModernCard>
            )}
            
            {highestDividendAsset && (
              <ModernCard className="p-4 border-l-4 border-l-warning-500">
                <div className="flex items-start justify-between mb-2">
                  <ModernCard.Icon 
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    } 
                    color="warning" 
                    className="mt-1"
                  />
                </div>
                <h4 className="text-sm font-semibold text-secondary-900 mb-2">
                  最も高い配当利回りの銘柄
                </h4>
                <p className="text-base font-bold text-secondary-900 mb-1">
                  {highestDividendAsset.name}
                </p>
                <p className="text-lg font-bold text-warning-600 mb-2">
                  {formatPercent(highestDividendAsset.dividendYield || 0, 2)}
                </p>
                <p className="text-xs text-secondary-500 mb-2">
                  年間配当金: {formatCurrency((highestDividendAsset.price * highestDividendAsset.holdings * (highestDividendAsset.dividendYield || 0) / 100), highestDividendAsset.currency)}
                </p>
                {highestDividendAsset.dividendFrequency && (
                  <div className="space-x-1">
                    <span className="inline-block bg-success-100 text-success-700 px-2 py-1 rounded-full text-xs font-medium">
                      {highestDividendAsset.dividendFrequency === 'monthly' ? '毎月分配' :
                       highestDividendAsset.dividendFrequency === 'quarterly' ? '四半期分配' :
                       highestDividendAsset.dividendFrequency === 'semi-annual' ? '半年分配' :
                       highestDividendAsset.dividendFrequency === 'annual' ? '年1回分配' : '配当あり'}
                    </span>
                    {highestDividendAsset.dividendIsEstimated && (
                      <span className="inline-block bg-warning-100 text-warning-700 px-2 py-1 rounded-full text-xs font-medium">
                        推定値
                      </span>
                    )}
                  </div>
                )}
              </ModernCard>
            )}
          </div>
          
          {/* ファンドタイプごとの手数料 */}
          {topFeeTypes.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-secondary-900 mb-4">
                ファンドタイプ別年間手数料（上位3種類）
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topFeeTypes.map(type => (
                  <ModernCard key={type.type} className="p-4" hover={false}>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-secondary-900">{type.type}</h5>
                      <span className="text-xs text-secondary-500 bg-secondary-100 px-2 py-1 rounded-full">
                        {type.count}銘柄
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-danger-600">
                        {formatCurrency(type.totalFee, baseCurrency)}
                      </p>
                      <p className="text-sm text-secondary-500">
                        平均手数料率: {formatPercent(type.avgFeeRate, 2)}
                      </p>
                    </div>
                  </ModernCard>
                ))}
              </div>
            </div>
          )}
          
          {/* ファンドタイプごとの配当 */}
          {topDividendTypes.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-secondary-900 mb-4">
                ファンドタイプ別年間配当金（上位3種類）
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topDividendTypes.map(type => (
                  <ModernCard key={type.type} className="p-4" hover={false}>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-secondary-900">{type.type}</h5>
                      <span className="text-xs text-secondary-500 bg-secondary-100 px-2 py-1 rounded-full">
                        {type.count}銘柄
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-success-600">
                        {formatCurrency(type.totalDividend, baseCurrency)}
                      </p>
                      <p className="text-sm text-secondary-500">
                        平均利回り: {formatPercent(type.avgDividendRate, 2)}
                      </p>
                    </div>
                  </ModernCard>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-secondary-50 rounded-xl border border-secondary-200">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-secondary-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h5 className="text-sm font-semibold text-secondary-900 mb-1">
                  計算について
                </h5>
                <p className="text-sm text-secondary-600 leading-relaxed">
                  手数料は各銘柄の現在の保有額と設定された年間手数料率に基づいて計算されています。
                  配当金は各銘柄の現在の保有額と推定配当利回りに基づいて計算されています。
                  より正確な情報は各金融機関やファンドの最新の資料を参照してください。
                </p>
              </div>
            </div>
          </div>
          </ModernCard.Content>
        </ModernCard>
      )}
    </div>
  );
};

export default PortfolioSummary;
