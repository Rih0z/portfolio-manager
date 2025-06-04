/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/settings/MarketSelectionWizard.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 
 * 説明:
 * 投資対象市場を選択するためのウィザード型アンケートコンポーネント。
 * 米国、日本、全世界、REIT、仮想通貨、債券などの市場を複数選択可能。
 * カード式UIで直感的な操作を提供し、AIプロンプト生成に情報を渡す。
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// 投資対象市場の定義
export const INVESTMENT_MARKETS = {
  US: {
    id: 'US',
    name: '米国市場',
    nameEn: 'US Market',
    icon: '🇺🇸',
    examples: ['S&P500', 'NASDAQ', '個別米国株'],
    examplesEn: ['S&P500', 'NASDAQ', 'Individual US Stocks'],
    japanAvailable: true,
    color: 'from-blue-500 to-blue-600'
  },
  JAPAN: {
    id: 'JAPAN',
    name: '日本市場',
    nameEn: 'Japan Market',
    icon: '🇯🇵',
    examples: ['日経225', 'TOPIX', '個別日本株'],
    examplesEn: ['Nikkei 225', 'TOPIX', 'Individual Japanese Stocks'],
    japanAvailable: true,
    color: 'from-red-500 to-red-600'
  },
  GLOBAL: {
    id: 'GLOBAL',
    name: '全世界',
    nameEn: 'Global Markets',
    icon: '🌐',
    examples: ['オルカン', 'VTI', '新興国含む'],
    examplesEn: ['All Country', 'VTI', 'Including Emerging Markets'],
    japanAvailable: true,
    color: 'from-green-500 to-green-600'
  },
  REIT: {
    id: 'REIT',
    name: 'REIT',
    nameEn: 'REIT',
    icon: '🏠',
    examples: ['J-REIT', '米国REIT', '不動産投資'],
    examplesEn: ['J-REIT', 'US REIT', 'Real Estate Investment'],
    japanAvailable: true,
    color: 'from-orange-500 to-orange-600'
  },
  CRYPTO: {
    id: 'CRYPTO',
    name: '仮想通貨',
    nameEn: 'Cryptocurrency',
    icon: '💎',
    examples: ['ビットコイン', 'イーサリアム', 'その他暗号資産'],
    examplesEn: ['Bitcoin', 'Ethereum', 'Other Crypto Assets'],
    japanAvailable: true,
    color: 'from-purple-500 to-purple-600'
  },
  BONDS: {
    id: 'BONDS',
    name: '債券',
    nameEn: 'Bonds',
    icon: '📊',
    examples: ['国債・社債', '先進国債券', '新興国債券'],
    examplesEn: ['Government/Corporate Bonds', 'Developed Market Bonds', 'Emerging Market Bonds'],
    japanAvailable: true,
    color: 'from-gray-500 to-gray-600'
  }
};

// 人気の組み合わせ
export const POPULAR_COMBINATIONS = [
  {
    id: 'us_japan',
    name: '米国 + 日本',
    nameEn: 'US + Japan',
    percentage: 68,
    markets: ['US', 'JAPAN']
  },
  {
    id: 'global_only',
    name: '全世界のみ',
    nameEn: 'Global Only',
    percentage: 23,
    markets: ['GLOBAL']
  },
  {
    id: 'us_japan_reit',
    name: '米国 + 日本 + REIT',
    nameEn: 'US + Japan + REIT',
    percentage: 15,
    markets: ['US', 'JAPAN', 'REIT']
  }
];

const MarketSelectionWizard = ({ 
  selectedMarkets = [], 
  onMarketsChange = () => {},
  showTitle = true,
  showPopularCombinations = true,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const [localSelectedMarkets, setLocalSelectedMarkets] = useState(selectedMarkets);
  const [animatingCards, setAnimatingCards] = useState(new Set());

  const isJapanese = i18n.language === 'ja';

  useEffect(() => {
    setLocalSelectedMarkets(selectedMarkets);
  }, [selectedMarkets]);

  const handleMarketToggle = (marketId) => {
    setAnimatingCards(prev => new Set(prev).add(marketId));
    
    setTimeout(() => {
      setAnimatingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(marketId);
        return newSet;
      });
    }, 200);

    const newSelectedMarkets = localSelectedMarkets.includes(marketId)
      ? localSelectedMarkets.filter(id => id !== marketId)
      : [...localSelectedMarkets, marketId];
    
    setLocalSelectedMarkets(newSelectedMarkets);
    onMarketsChange(newSelectedMarkets);
  };

  const handlePopularCombinationSelect = (combination) => {
    setLocalSelectedMarkets(combination.markets);
    onMarketsChange(combination.markets);
  };

  const isMarketSelected = (marketId) => localSelectedMarkets.includes(marketId);

  return (
    <div className={`space-y-6 ${className}`}>
      {showTitle && (
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">
            {isJapanese ? 'どの市場に投資したいですか？' : 'Which markets would you like to invest in?'}
          </h3>
          <p className="text-gray-400 text-sm">
            {isJapanese ? '複数選択可能です' : 'Multiple selections allowed'}
          </p>
        </div>
      )}

      {/* Market Selection Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.values(INVESTMENT_MARKETS).map((market) => {
          const isSelected = isMarketSelected(market.id);
          const isAnimating = animatingCards.has(market.id);
          
          return (
            <button
              key={market.id}
              onClick={() => handleMarketToggle(market.id)}
              className={`
                relative overflow-hidden rounded-lg p-4 transition-all duration-200 group
                ${isSelected 
                  ? `bg-gradient-to-br ${market.color} shadow-lg scale-105 border-2 border-white/20` 
                  : 'bg-dark-300 hover:bg-dark-200 border-2 border-transparent hover:border-gray-600'
                }
                ${isAnimating ? 'scale-110' : ''}
                focus:outline-none focus:ring-2 focus:ring-primary-400
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {/* Market content */}
              <div className="text-center space-y-2">
                <div className="text-3xl mb-2">{market.icon}</div>
                <h4 className="font-semibold text-white text-sm">
                  {isJapanese ? market.name : market.nameEn}
                </h4>
                <div className="space-y-1">
                  {(isJapanese ? market.examples : market.examplesEn).map((example, index) => (
                    <div key={index} className="text-xs text-gray-300">
                      {example}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hover effect */}
              <div className={`
                absolute inset-0 bg-gradient-to-br ${market.color} opacity-0 group-hover:opacity-10 transition-opacity duration-200
                ${isSelected ? 'opacity-20' : ''}
              `} />
            </button>
          );
        })}
      </div>

      {/* Popular Combinations */}
      {showPopularCombinations && (
        <div className="mt-6">
          <h4 className="text-lg font-medium text-white mb-3">
            {isJapanese ? '人気の組み合わせ:' : 'Popular Combinations:'}
          </h4>
          <div className="space-y-2">
            {POPULAR_COMBINATIONS.map((combination) => (
              <button
                key={combination.id}
                onClick={() => handlePopularCombinationSelect(combination)}
                className="w-full text-left p-3 bg-dark-300 hover:bg-dark-200 rounded-lg transition-colors duration-200 border border-dark-400 hover:border-gray-600"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-400 font-bold">
                      {combination.percentage === 68 ? '🥇' : combination.percentage === 23 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-white font-medium">
                      {isJapanese ? combination.name : combination.nameEn}
                    </span>
                  </div>
                  <span className="text-gray-400 text-sm">
                    ({combination.percentage}%)
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {localSelectedMarkets.length > 0 && (
        <div className="mt-6 p-4 bg-dark-300 rounded-lg border border-dark-400">
          <h4 className="text-white font-medium mb-2">
            {isJapanese ? '選択された市場:' : 'Selected Markets:'}
          </h4>
          <div className="flex flex-wrap gap-2">
            {localSelectedMarkets.map((marketId) => {
              const market = INVESTMENT_MARKETS[marketId];
              return (
                <span
                  key={marketId}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm bg-gradient-to-r ${market.color} text-white`}
                >
                  <span className="mr-1">{market.icon}</span>
                  {isJapanese ? market.name : market.nameEn}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketSelectionWizard;