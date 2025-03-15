
// src/components/common/DataSourceBadge.jsx

import React from 'react';

/**
 * データ取得元を表示するバッジコンポーネント
 * 各データソースに応じた色と表示を行う
 */
const DataSourceBadge = ({ source, showIcon = true }) => {
  // ソースに応じたスタイルと説明を設定
  const sourceConfig = {
    'Yahoo Finance': {
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      icon: '📊',
      title: 'Yahoo Finance APIから取得'
    },
    'Alpha Vantage': {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      icon: '📈',
      title: 'Alpha Vantage APIから取得'
    },
    'MOF': {
      bgColor: 'bg-indigo-100',
      textColor: 'text-indigo-800',
      icon: '🏛️',
      title: '財務省データから取得'
    },
    'Fallback': {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      icon: '⚠️',
      title: 'デフォルト値を使用中（最新データの取得に失敗）'
    },
    'Default Values': {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      icon: '⚠️',
      title: 'デフォルト値を使用中'
    },
    'Cache': {
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
      icon: '💾',
      title: 'キャッシュデータを使用中'
    }
  };
  
  // 不明なソースの場合のデフォルト値
  const config = sourceConfig[source] || {
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: 'ℹ️',
    title: '不明なデータソース'
  };
  
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
      title={config.title}
    >
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {source}
    </span>
  );
};

export default DataSourceBadge;

