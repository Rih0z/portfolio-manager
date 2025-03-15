import React from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatDate } from '../../utils/formatters';

const DataStatusBar = () => {
  const { 
    lastUpdated, 
    exchangeRate, 
    baseCurrency, 
    refreshMarketPrices,
    isLoading
  } = usePortfolioContext();
  
  // データの鮮度に基づいた警告表示判定
  const needsUpdate = 
    !lastUpdated || 
    (new Date() - new Date(lastUpdated)) > 24 * 60 * 60 * 1000;

  return (
    <div className={`text-xs px-4 py-2 ${needsUpdate ? 'bg-yellow-50' : 'bg-gray-50'} border-t border-b`}>
      <div className="flex flex-wrap items-center justify-between">
        <div className="flex items-center space-x-2 my-1">
          <span className="text-gray-500">最終更新:</span>
          <span className="font-medium">{lastUpdated ? formatDate(lastUpdated) : '未取得'}</span>
          
          {exchangeRate && (
            <>
              <span className="text-gray-500 ml-2">為替レート (USD/JPY):</span>
              <span className="font-medium">{exchangeRate.rate?.toFixed(2) || '---'}</span>
              {exchangeRate.source && (
                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                  {exchangeRate.source}
                </span>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2 my-1">
          {needsUpdate && (
            <div className="text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded flex items-center">
              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
              </svg>
              データの更新が必要です
            </div>
          )}
          
          <button
            onClick={refreshMarketPrices}
            disabled={isLoading}
            className={`text-blue-600 hover:text-blue-800 flex items-center ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                更新中...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"></path>
                </svg>
                更新
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataStatusBar;