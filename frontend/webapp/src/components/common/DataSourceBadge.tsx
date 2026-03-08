/**
 * データソースバッジコンポーネント
 *
 * 各種データソースに応じた色分けとアイコン表示を行う。
 * 絵文字ではなく Lucide Icons を使用。
 *
 * @file src/components/common/DataSourceBadge.tsx
 */
import React from 'react';
import { BarChart3, TrendingUp, ArrowLeftRight, AlertTriangle, HardDrive, RefreshCw, Info } from 'lucide-react';

interface DataSourceBadgeProps {
  source: string;
  showIcon?: boolean;
}

const sourceConfig: Record<string, {
  bgColor: string;
  textColor: string;
  Icon: React.ElementType;
  title: string;
}> = {
  'Alpaca': {
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-800 dark:text-blue-300',
    Icon: BarChart3,
    title: 'Alpaca APIから取得した米国株データ',
  },
  'Yahoo Finance': {
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-800 dark:text-green-300',
    Icon: TrendingUp,
    title: 'Yahoo Finance APIから取得した株価・投資信託データ',
  },
  'exchangerate.host': {
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    textColor: 'text-indigo-800 dark:text-indigo-300',
    Icon: ArrowLeftRight,
    title: 'exchangerate.hostから取得した為替レートデータ',
  },
  'Fallback': {
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-800 dark:text-yellow-300',
    Icon: AlertTriangle,
    title: 'デフォルト値を使用中（最新データの取得に失敗）',
  },
  'Default Values': {
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-800 dark:text-yellow-300',
    Icon: AlertTriangle,
    title: 'デフォルト値を使用中',
  },
  'Cache': {
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-800 dark:text-purple-300',
    Icon: HardDrive,
    title: 'キャッシュデータを使用中',
  },
  'Alpha Vantage': {
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    textColor: 'text-gray-800 dark:text-gray-300',
    Icon: RefreshCw,
    title: '旧API (Alpha Vantage) からのデータ',
  },
  'Python yfinance': {
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    textColor: 'text-gray-800 dark:text-gray-300',
    Icon: RefreshCw,
    title: '旧API (Python yfinance) からのデータ',
  },
};

const defaultConfig = {
  bgColor: 'bg-gray-100 dark:bg-gray-700',
  textColor: 'text-gray-800 dark:text-gray-300',
  Icon: Info,
  title: '不明なデータソース',
};

const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ source, showIcon = true }) => {
  const config = sourceConfig[source] || defaultConfig;

  let displayText = source;
  if (source === 'Yahoo Finance') displayText = 'YFinance';
  else if (source === 'exchangerate.host') displayText = 'Exchg.host';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
      title={config.title}
    >
      {showIcon && <config.Icon size={12} />}
      {displayText}
    </span>
  );
};

export default DataSourceBadge;
