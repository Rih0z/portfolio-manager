/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/pages/InvestmentCalculator.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-07-09 10:00:00 
 * 
 * 更新履歴: 
 * - 2025-07-09 10:00:00 Koki Riho 初回作成
 * 
 * 説明: 
 * 入金額に基づいて各銘柄への最適な投資配分を計算するページ。
 * 現在の保有比率と理想比率を比較し、どの銘柄に何円投資すべきかを提案する。
 */
import React, { useState, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PortfolioContext } from '../context/PortfolioContext';
import { AuthContext } from '../context/AuthContext';
import ModernCard from '../components/common/ModernCard';
import ModernInput from '../components/common/ModernInput';
import DarkButton from '../components/common/DarkButton';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const InvestmentCalculator = () => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const { 
    currentAssets,
    targetPortfolio,
    exchangeRate = 150,
    portfolioCache,
    recalculateMetrics,
    updateCurrentAssets
  } = useContext(PortfolioContext);

  const [inputAmount, setInputAmount] = useState('');
  const [calculatedAllocations, setCalculatedAllocations] = useState(null);
  const [loading, setLoading] = useState(false);

  // 現在のポートフォリオ総額を計算
  const currentTotalValue = useMemo(() => {
    if (!currentAssets || currentAssets.length === 0) return 0;
    
    return currentAssets.reduce((total, asset) => {
      const cacheKey = `${asset.symbol}-${asset.exchange}`;
      const stockData = portfolioCache?.marketData?.[cacheKey];
      
      if (stockData?.currentPrice) {
        const valueInJPY = asset.exchange === 'TSE' 
          ? stockData.currentPrice * asset.shares
          : stockData.currentPrice * asset.shares * exchangeRate;
        return total + valueInJPY;
      }
      return total;
    }, 0);
  }, [currentAssets, portfolioCache, exchangeRate]);

  // 現在の保有比率を計算
  const currentAllocation = useMemo(() => {
    if (!currentAssets || currentAssets.length === 0 || currentTotalValue === 0) return {};
    
    const allocation = {};
    currentAssets.forEach(asset => {
      const cacheKey = `${asset.symbol}-${asset.exchange}`;
      const stockData = portfolioCache?.marketData?.[cacheKey];
      
      if (stockData?.currentPrice) {
        const valueInJPY = asset.exchange === 'TSE' 
          ? stockData.currentPrice * asset.shares
          : stockData.currentPrice * asset.shares * exchangeRate;
        allocation[cacheKey] = (valueInJPY / currentTotalValue) * 100;
      }
    });
    
    return allocation;
  }, [currentAssets, portfolioCache, exchangeRate, currentTotalValue]);

  // 理想の保有比率を取得
  const targetAllocation = useMemo(() => {
    if (!targetPortfolio || targetPortfolio.length === 0) return {};
    
    const allocation = {};
    targetPortfolio.forEach(target => {
      const cacheKey = `${target.symbol}-${target.exchange}`;
      allocation[cacheKey] = target.percentage || 0;
    });
    
    return allocation;
  }, [targetPortfolio]);

  // 投資配分を計算
  const calculateOptimalAllocation = () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      alert(t('investmentCalculator.enterValidAmount'));
      return;
    }

    setLoading(true);
    const amount = parseFloat(inputAmount);
    const newTotalValue = currentTotalValue + amount;

    // 各銘柄への最適配分を計算
    const allocations = [];
    const allSymbols = new Set([
      ...Object.keys(targetAllocation),
      ...Object.keys(currentAllocation)
    ]);

    allSymbols.forEach(cacheKey => {
      const [symbol, exchange] = cacheKey.split('-');
      const targetPct = targetAllocation[cacheKey] || 0;
      const currentPct = currentAllocation[cacheKey] || 0;
      
      // 理想的な金額
      const idealValue = newTotalValue * (targetPct / 100);
      
      // 現在の保有額
      const currentAsset = currentAssets.find(a => 
        a.symbol === symbol && a.exchange === exchange
      );
      const stockData = portfolioCache?.marketData?.[cacheKey];
      
      let currentValue = 0;
      if (currentAsset && stockData?.currentPrice) {
        currentValue = currentAsset.exchange === 'TSE' 
          ? stockData.currentPrice * currentAsset.shares
          : stockData.currentPrice * currentAsset.shares * exchangeRate;
      }
      
      // 必要な追加投資額
      const requiredInvestment = Math.max(0, idealValue - currentValue);
      
      // 投資配分の割合
      const allocationPercentage = amount > 0 ? (requiredInvestment / amount) * 100 : 0;
      
      allocations.push({
        symbol,
        exchange,
        name: stockData?.name || symbol,
        currentPrice: stockData?.currentPrice || 0,
        currentValue,
        currentPercentage: currentPct,
        targetPercentage: targetPct,
        requiredInvestment,
        allocationPercentage,
        shares: stockData?.currentPrice ? 
          Math.floor(requiredInvestment / (exchange === 'TSE' ? stockData.currentPrice : stockData.currentPrice * exchangeRate)) : 0
      });
    });

    // 必要投資額の合計
    const totalRequired = allocations.reduce((sum, a) => sum + a.requiredInvestment, 0);

    // 入金額が必要額より少ない場合、比例配分
    if (totalRequired > amount) {
      const scale = amount / totalRequired;
      allocations.forEach(a => {
        a.requiredInvestment *= scale;
        a.shares = a.currentPrice ? 
          Math.floor(a.requiredInvestment / (a.exchange === 'TSE' ? a.currentPrice : a.currentPrice * exchangeRate)) : 0;
        a.allocationPercentage = (a.requiredInvestment / amount) * 100;
      });
    }

    // 投資額が0より大きい銘柄のみを降順でソート
    const filteredAllocations = allocations
      .filter(a => a.requiredInvestment > 0)
      .sort((a, b) => b.requiredInvestment - a.requiredInvestment);

    setCalculatedAllocations({
      inputAmount: amount,
      allocations: filteredAllocations,
      totalAllocated: filteredAllocations.reduce((sum, a) => sum + a.requiredInvestment, 0)
    });

    setLoading(false);
  };

  // AIプロンプトを生成
  const generateAIPrompt = () => {
    if (!calculatedAllocations) return '';

    const prompt = `私は${formatCurrency(calculatedAllocations.inputAmount, 'JPY')}を投資したいと考えています。

現在のポートフォリオ総額: ${formatCurrency(currentTotalValue, 'JPY')}

投資配分の提案:
${calculatedAllocations.allocations.map(a => 
  `- ${a.name} (${a.symbol}): ${formatCurrency(a.requiredInvestment, 'JPY')} (${a.shares}株)`
).join('\n')}

この投資配分について、以下の観点からアドバイスをください：
1. 現在の市場環境を考慮した投資タイミング
2. 各銘柄のリスクとリターンのバランス
3. 今後の投資戦略`;

    return prompt;
  };

  // ポートフォリオ設定のチェック
  const hasCurrentAssets = currentAssets && currentAssets.length > 0;
  const hasTargetPortfolio = targetPortfolio && targetPortfolio.length > 0;
  
  if (!hasCurrentAssets || !hasTargetPortfolio) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{t('investmentCalculator.title')}</h1>
        
        <ModernCard className="text-center">
          <div className="py-8 px-4">
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative w-16 h-16 bg-dark-300 rounded-full flex items-center justify-center border border-dark-400">
                <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-xl font-semibold mb-4 text-gray-100">
              {t('investmentCalculator.setupRequired.title')}
            </h2>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              {t('investmentCalculator.setupRequired.description')}
            </p>
            
            {!hasCurrentAssets && (
              <div className="mb-6 p-4 bg-dark-300/50 rounded-lg border border-dark-400">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-sm font-medium text-gray-200">
                    {t('investmentCalculator.setupRequired.currentPortfolioMissing')}
                  </h3>
                </div>
                <p className="text-sm text-gray-400 ml-7">
                  {t('investmentCalculator.setupRequired.currentPortfolioHint')}
                </p>
              </div>
            )}
            
            {!hasTargetPortfolio && (
              <div className="mb-6 p-4 bg-dark-300/50 rounded-lg border border-dark-400">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-sm font-medium text-gray-200">
                    {t('investmentCalculator.setupRequired.targetPortfolioMissing')}
                  </h3>
                </div>
                <p className="text-sm text-gray-400 ml-7">
                  {t('investmentCalculator.setupRequired.targetPortfolioHint')}
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <DarkButton
                onClick={() => window.location.href = '/settings'}
                className="w-full"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t('investmentCalculator.setupRequired.goToSettings')}
              </DarkButton>
              
              {!hasTargetPortfolio && (
                <DarkButton
                  onClick={() => window.location.href = '/ai-advisor'}
                  variant="secondary"
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  {t('investmentCalculator.setupRequired.useAIAdvisor')}
                </DarkButton>
              )}
            </div>
            
            <div className="mt-8 p-4 bg-primary-500/5 rounded-lg border border-primary-500/20">
              <p className="text-sm text-primary-300">
                💡 {t('investmentCalculator.setupRequired.tip')}
              </p>
            </div>
          </div>
        </ModernCard>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">{t('investmentCalculator.title')}</h1>
      
      {/* 入金額入力セクション */}
      <ModernCard className="mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('investmentCalculator.enterAmount')}</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <ModernInput
              type="number"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder={t('investmentCalculator.amountPlaceholder')}
              min="0"
              step="1000"
              label={t('investmentCalculator.investmentAmount')}
            />
          </div>
          <DarkButton
            onClick={calculateOptimalAllocation}
            disabled={loading || !inputAmount || parseFloat(inputAmount) <= 0}
            className="px-6"
          >
            {loading ? t('common.calculating') : t('investmentCalculator.calculate')}
          </DarkButton>
        </div>
      </ModernCard>

      {/* 現在の配分と理想配分の比較 */}
      <ModernCard className="mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('investmentCalculator.currentVsTarget')}</h2>
        <div className="space-y-2">
          {Object.keys(targetAllocation).map(cacheKey => {
            const [symbol, exchange] = cacheKey.split('-');
            const stockData = portfolioCache?.marketData?.[cacheKey];
            const current = currentAllocation[cacheKey] || 0;
            const target = targetAllocation[cacheKey] || 0;
            const diff = target - current;
            
            return (
              <div key={cacheKey} className="flex items-center justify-between p-2 rounded-lg bg-dark-300/50">
                <div className="flex-1">
                  <span className="font-medium">{stockData?.name || symbol}</span>
                  <span className="text-sm text-gray-400 ml-2">({symbol})</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400">
                    {t('investmentCalculator.current')}: {formatPercentage(current)}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="text-primary-400">
                    {t('investmentCalculator.target')}: {formatPercentage(target)}
                  </span>
                  <span className={`font-medium ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    ({diff > 0 ? '+' : ''}{formatPercentage(diff)})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ModernCard>

      {/* 計算結果 */}
      {calculatedAllocations && (
        <ModernCard className="mb-6">
          <h2 className="text-lg font-semibold mb-4">{t('investmentCalculator.results')}</h2>
          
          <div className="mb-4 p-4 bg-primary-500/10 rounded-lg">
            <p className="text-sm text-gray-400">{t('investmentCalculator.totalInvestment')}</p>
            <p className="text-2xl font-bold text-primary-400">
              {formatCurrency(calculatedAllocations.inputAmount, 'JPY')}
            </p>
          </div>

          <div className="space-y-3">
            {calculatedAllocations.allocations.map((allocation, index) => (
              <div key={`${allocation.symbol}-${allocation.exchange}`} 
                   className="p-4 bg-dark-300/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-lg">{allocation.name}</span>
                    <span className="text-sm text-gray-400 ml-2">({allocation.symbol})</span>
                  </div>
                  <span className="text-lg font-bold text-primary-400">
                    {formatCurrency(allocation.requiredInvestment, 'JPY')}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                  <div>
                    {t('investmentCalculator.shares')}: <span className="text-gray-200">{allocation.shares}</span>
                  </div>
                  <div>
                    {t('investmentCalculator.allocation')}: <span className="text-gray-200">{formatPercentage(allocation.allocationPercentage)}</span>
                  </div>
                  <div>
                    {t('investmentCalculator.currentPrice')}: <span className="text-gray-200">
                      {formatCurrency(allocation.currentPrice, allocation.exchange === 'TSE' ? 'JPY' : 'USD')}
                    </span>
                  </div>
                  <div>
                    {t('investmentCalculator.exchange')}: <span className="text-gray-200">{allocation.exchange}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* AIプロンプト生成ボタン */}
          <div className="mt-6">
            <DarkButton
              onClick={() => {
                const prompt = generateAIPrompt();
                navigator.clipboard.writeText(prompt);
                alert(t('investmentCalculator.promptCopied'));
              }}
              variant="secondary"
              className="w-full"
            >
              {t('investmentCalculator.copyAIPrompt')}
            </DarkButton>
          </div>
        </ModernCard>
      )}
    </div>
  );
};

export default InvestmentCalculator;