/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/settings/HoldingsEditor.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * 保有資産の数量編集を行うコンポーネント。
 * 各銘柄の保有数量の増減、編集、削除機能を提供する。
 * 銘柄ごとの評価額、年間手数料、年間配当金の計算と表示も行う。
 * 小数点以下4桁まで対応した精度の高い保有数量管理が可能。
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { FUND_TYPES } from '../../utils/fundUtils';
import ModernCard from '../common/ModernCard';
import ModernButton from '../common/ModernButton';
import ModernForm from '../common/ModernForm';
import ModernHoldingCard from './ModernHoldingCard';

const HoldingsEditor = () => {
  const { t } = useTranslation();
  const { 
    currentAssets,
    updateHoldings,
    removeTicker,
    baseCurrency,
    exchangeRate
  } = usePortfolioContext();
  
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // 銘柄の削除
  const handleRemoveTicker = (id, name) => {
    if (window.confirm(`${name}を削除してもよろしいですか？`)) {
      removeTicker(id);
      showMessage(`${name}を削除しました`, 'success');
    }
  };

  // メッセージの表示
  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  // 保有資産がない場合
  if (currentAssets.length === 0) {
    return (
      <ModernCard className="text-center" gradient={true}>
        <div className="py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-secondary-100 to-secondary-200 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-secondary-600">
            保有資産が設定されていません。上部の「銘柄の追加」セクションから銘柄を追加してください。
          </p>
        </div>
      </ModernCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Holdings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {currentAssets.map((asset) => (
          <ModernHoldingCard
            key={asset.id}
            asset={asset}
            baseCurrency={baseCurrency}
            exchangeRate={exchangeRate}
            onUpdateHoldings={(id, value) => {
              updateHoldings(id, value);
              showMessage('保有数量を更新しました', 'success');
            }}
            onRemove={handleRemoveTicker}
          />
        ))}
      </div>
      
      {/* Info Section */}
      <ModernCard>
        <ModernCard.Header>
          <ModernCard.Title>手数料・配当情報について</ModernCard.Title>
        </ModernCard.Header>
        
        <ModernCard.Content>
          <p className="text-sm text-secondary-600 mb-4 leading-relaxed">
            手数料や配当情報は銘柄タイプから自動的に判定されています。ファンドの手数料率はファンドの種類から推定されますが、個別株は運用会社が存在しないため手数料は0%となります。配当利回りは銘柄の種類や名称から推定されています。市場データ更新時に最新情報が自動的に取得されます。
          </p>
          
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
              個別株 (0%)
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
              推定値
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
              ティッカー固有の情報
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
              毎月配当
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
              四半期配当
            </span>
          </div>
        </ModernCard.Content>
      </ModernCard>
      
      {/* Message Display */}
      {message && (
        <ModernCard className={`border-l-4 ${
          messageType === 'success' 
            ? 'border-l-success-500 bg-success-50' 
            : messageType === 'warning'
              ? 'border-l-warning-500 bg-warning-50'
              : 'border-l-danger-500 bg-danger-50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`flex-shrink-0 ${
              messageType === 'success' 
                ? 'text-success-600' 
                : messageType === 'warning'
                  ? 'text-warning-600'
                  : 'text-danger-600'
            }`}>
              {messageType === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : messageType === 'warning' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className={`text-sm font-medium ${
              messageType === 'success' 
                ? 'text-success-800' 
                : messageType === 'warning'
                  ? 'text-warning-800'
                  : 'text-danger-800'
            }`}>
              {message}
            </p>
          </div>
        </ModernCard>
      )}
    </div>
  );
};

export default HoldingsEditor;