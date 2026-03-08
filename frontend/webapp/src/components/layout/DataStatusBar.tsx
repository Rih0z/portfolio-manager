/**
 * データの状態を表示するステータスバーコンポーネント
 *
 * 最終更新日時、為替レート情報、データ更新が必要かどうかの警告を表示。
 * Lucide Icons + テーマ対応カラーを使用。
 *
 * @file src/components/layout/DataStatusBar.tsx
 */
import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatDate } from '../../utils/formatters';

const DataStatusBar = () => {
  const {
    lastUpdated,
    exchangeRate,
    baseCurrency,
    refreshMarketPrices,
    isLoading,
  } = usePortfolioContext();

  const needsUpdate =
    !lastUpdated ||
    new Date().getTime() - new Date(lastUpdated).getTime() > 24 * 60 * 60 * 1000;

  return (
    <div
      className={`text-xs px-4 py-2 rounded-lg ${
        needsUpdate
          ? 'bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/20'
          : 'bg-muted border border-border'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between">
        <div className="flex items-center space-x-2 my-1">
          <span className="text-muted-foreground">最終更新:</span>
          <span className="font-medium text-foreground">
            {lastUpdated ? formatDate(lastUpdated) : '未取得'}
          </span>

          {exchangeRate && (
            <>
              <span className="text-muted-foreground ml-2">為替レート (USD/JPY):</span>
              <span
                className={`font-medium font-mono tabular-nums ${
                  exchangeRate.source === 'Default'
                    ? 'text-warning-600 dark:text-warning-400'
                    : exchangeRate.source === 'Fallback'
                      ? 'text-warning-500 dark:text-warning-400'
                      : 'text-foreground'
                }`}
              >
                {exchangeRate.rate?.toFixed(2) || '---'}
              </span>
              {exchangeRate.source && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    exchangeRate.source === 'Default'
                      ? 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400'
                      : exchangeRate.source === 'Fallback'
                        ? 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400'
                        : 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                  }`}
                >
                  {exchangeRate.source}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center space-x-2 my-1">
          {needsUpdate && (
            <div className="text-warning-700 dark:text-warning-400 bg-warning-100 dark:bg-warning-500/20 px-2 py-0.5 rounded flex items-center">
              <AlertTriangle size={14} className="mr-1" />
              データの更新が必要です
            </div>
          )}

          <button
            onClick={refreshMarketPrices}
            disabled={isLoading}
            className={`text-primary-500 hover:text-primary-600 flex items-center font-medium ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? '更新中...' : '更新'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataStatusBar;
