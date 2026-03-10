import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { FUND_TYPES } from '../../utils/fundUtils';
import { getJapaneseStockName } from '../../utils/japaneseStockNames';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type { Asset, ExchangeRate } from '../../types/portfolio.types';

interface HoldingCardProps {
  asset: Asset;
  baseCurrency: string;
  exchangeRate: ExchangeRate;
  onUpdateHoldings: (id: string, value: number) => void;
  onRemove: (id: string, name: string) => void;
}

const HoldingCard = React.memo(({
  asset,
  baseCurrency,
  exchangeRate,
  onUpdateHoldings,
  onRemove
}: HoldingCardProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(asset.holdings.toString());
  const [validationError, setValidationError] = useState('');

  // 資産の評価額を計算
  const calculateAssetValue = () => {
    let value = asset.price * asset.holdings;
    
    // 通貨換算
    if (asset.currency !== baseCurrency) {
      if (baseCurrency === 'JPY' && asset.currency === 'USD') {
        value *= exchangeRate.rate || 150;
      } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
        value /= exchangeRate.rate || 150;
      }
    }
    
    return value;
  };

  // 年間手数料を計算
  const calculateAnnualFee = () => {
    if (asset.fundType === FUND_TYPES.STOCK || asset.isStock) {
      return 0;
    }
    
    const assetValue = calculateAssetValue();
    return assetValue * (asset.annualFee || 0) / 100;
  };
  
  // 年間配当金を計算
  const calculateAnnualDividend = () => {
    if (!asset.hasDividend) {
      return 0;
    }
    
    const assetValue = calculateAssetValue();
    return assetValue * (asset.dividendYield || 0) / 100;
  };

  const handleSave = () => {
    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0) {
      setValidationError('有効な数値を入力してください');
      return;
    }

    setValidationError('');
    onUpdateHoldings(asset.id, parseFloat(value.toFixed(4)));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(asset.holdings.toString());
    setValidationError('');
    setIsEditing(false);
  };

  const handleIncrement = (amount: number) => {
    const newValue = Math.max(0, asset.holdings + amount);
    onUpdateHoldings(asset.id, parseFloat(newValue.toFixed(4)));
  };

  const assetValue = calculateAssetValue();
  const annualFee = calculateAnnualFee();
  const annualDividend = calculateAnnualDividend();

  // 日本の投資信託や株式の場合、わかりやすい名前を取得
  const displayName = React.useMemo(() => {
    const symbol = asset.symbol;
    if (!symbol) return asset.name;
    // 投資信託の場合（複数のパターンに対応）
    if (/^(\d{8}|\d{7}[A-Z]|[A-Z0-9]{8})$/i.test(symbol)) {
      const japaneseName = getJapaneseStockName(symbol);
      return japaneseName !== symbol ? japaneseName : asset.name;
    }
    // 日本株の場合
    if (/^\d{4}(\.T)?$/.test(symbol)) {
      const japaneseName = getJapaneseStockName(symbol);
      return japaneseName !== symbol ? japaneseName : asset.name;
    }
    return asset.name;
  }, [asset.symbol, asset.name]);

  return (
    <Card hoverable padding="medium" className="transition-all duration-200" data-testid="holding-card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="font-bold text-lg text-secondary-900">
              {asset.symbol}
            </h3>
            <span className="text-sm text-secondary-500 bg-secondary-100 px-2 py-1 rounded-full">
              {asset.currency}
            </span>
            {asset.fundType && (
              <span className="text-xs text-primary-700 bg-primary-100 px-2 py-1 rounded-full">
                {asset.fundType}
              </span>
            )}
          </div>
          
          <p className="text-sm text-secondary-600 mb-1 font-medium">
            {displayName}
          </p>
          
          <p className="text-sm text-secondary-500">
            価格: {formatCurrency(asset.price, asset.currency)}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(asset.id, asset.name)}
          aria-label={`${asset.symbol}を削除`}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
          className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
        />
      </div>

      {/* Holdings Editor */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-secondary-900 mb-2">
          保有数量
        </label>
        
        {isEditing ? (
          <div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={editValue}
                onChange={(e) => { setEditValue(e.target.value); setValidationError(''); }}
                step="0.0001"
                min="0"
                className="flex-1"
                aria-invalid={validationError ? true : undefined}
                aria-describedby={validationError ? `holding-error-${asset.id}` : undefined}
                aria-label={`${asset.symbol}の保有数量`}
              />
              <Button size="sm" onClick={handleSave} variant="success">
                保存
              </Button>
              <Button size="sm" onClick={handleCancel} variant="secondary">
                キャンセル
              </Button>
            </div>
            {validationError && (
              <p id={`holding-error-${asset.id}`} role="alert" className="text-xs text-danger-600 mt-1">
                {validationError}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xl font-bold text-secondary-900">
                {asset.holdings.toLocaleString()}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setEditValue(asset.holdings.toString()); setIsEditing(true); }}
                aria-label={`${asset.symbol}の保有数量を編集`}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
              />
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleIncrement(-1)}
                disabled={asset.holdings <= 0}
                aria-label={`${asset.symbol}の保有数量を1減らす`}
              >
                -1
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleIncrement(1)}
                aria-label={`${asset.symbol}の保有数量を1増やす`}
              >
                +1
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleIncrement(10)}
                aria-label={`${asset.symbol}の保有数量を10増やす`}
              >
                +10
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Asset Information */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-secondary-200">
        <div>
          <p className="text-xs text-secondary-500 mb-1">評価額</p>
          <p className="text-lg font-bold text-primary-600">
            {formatCurrency(assetValue, baseCurrency)}
          </p>
        </div>
        
        {annualFee > 0 && (
          <div>
            <p className="text-xs text-secondary-500 mb-1">年間手数料</p>
            <p className="text-sm font-semibold text-danger-600">
              {formatCurrency(annualFee, baseCurrency)}
            </p>
            <p className="text-xs text-secondary-500">
              {formatPercent(asset.annualFee || 0, 2)}
            </p>
          </div>
        )}
        
        {annualDividend > 0 && (
          <div>
            <p className="text-xs text-secondary-500 mb-1">年間配当金</p>
            <p className="text-sm font-semibold text-success-600">
              {formatCurrency(annualDividend, baseCurrency)}
            </p>
            <p className="text-xs text-secondary-500">
              {formatPercent(asset.dividendYield || 0, 2)}
            </p>
          </div>
        )}
        
        {asset.hasDividend && asset.dividendFrequency && (
          <div>
            <p className="text-xs text-secondary-500 mb-1">配当頻度</p>
            <span className="text-xs bg-success-100 text-success-700 px-2 py-1 rounded-full">
              {asset.dividendFrequency === 'monthly' ? '毎月' :
               asset.dividendFrequency === 'quarterly' ? '四半期' :
               asset.dividendFrequency === 'semi-annual' ? '半年' :
               asset.dividendFrequency === 'annual' ? '年1回' : '不明'}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
});

HoldingCard.displayName = 'HoldingCard';

export default HoldingCard;